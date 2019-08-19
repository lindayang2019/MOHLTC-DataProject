const {checkPermission, Permission, error} = require('./helpers');
const Package = require('../../models/package/package');
const PackageValue = require('../../models/package/packageValue');
const Value = require('../../models/workbook/value');
const User = require('../../models/user');
const {Organization} = require('../../models/organization');
const Workbook = require('../../models/workbook/workbook');
const mongoose = require('mongoose');

async function userGetPackageAndWorkbook(next, currentUserId, groupNumber, packageName, name) {
    // find package
    let organizations = await Organization.find({users: currentUserId}, '_id');
    organizations = organizations.map(org => org._id);
    const pack = await Package.findOne({
        groupNumber, name: packageName, organizations: {$in: organizations},
    }).populate({path: 'workbooks', select: 'name'});
    if (!pack) return next({status: 400, message: `Package (${packageName}) does not exist.`});
    let workbook;
    if (name) {
        // find workbook that matches the name
        workbook = pack.workbooks.find(wb => wb.name === name);
        if (!workbook) return next({status: 400, message: 'Workbook does not exist.'});
    }
    return {workbook, pack, organizations};
}

module.exports = {
    /**
     * Admin gets a single package.
     */
    adminGetPackage: async (req, res, next) => {
        if (!checkPermission(req, Permission.PACKAGE_MANAGEMENT)) {
            return next(error.api.NO_PERMISSION);
        }
        const groupNumber = req.session.user.groupNumber;
        const name = req.params.name; // package name
        try {
            const pack = await Package.findOne({groupNumber, name}).populate({
                path: 'workbooks',
                select: 'name'
            });
            if (!pack) return next({status: 400, message: `Package (${name}) does not exist.`});
            res.json({success: true, package: pack})
        } catch (e) {
            next(e);
        }
    },

    userGetPackage: async (req, res, next) => {
        const groupNumber = req.session.user.groupNumber;
        const currentUserId = req.session.user._id;
        const name = req.params.name; // package name
        try {
            const {pack} = await userGetPackageAndWorkbook(next, currentUserId, groupNumber, name);
            res.json({success: true, package: pack})
        } catch (e) {
            next(e);
        }
    },

    adminGetAllPackages: async (req, res, next) => {
        if (!checkPermission(req, Permission.PACKAGE_MANAGEMENT)) {
            return next(error.api.NO_PERMISSION);
        }
        const groupNumber = req.session.user.groupNumber;
        try {
            const packages = await Package.find({groupNumber});
            res.json({success: true, packages})
        } catch (e) {
            next(e);
        }
    },

    userGetAllPackages: async (req, res, next) => {
        const groupNumber = req.session.user.groupNumber;
        const currentUserId = req.session.user._id;
        try {
            let organizations = await Organization.find({users: currentUserId}, '_id');
            organizations = organizations.map(org => org._id);
            const packages = await Package.find({groupNumber, organizations: {$in: organizations}});
            return res.json({success: true, packages});
        } catch (e) {
            next(e);
        }
    },

    adminDeletePackage: async (req, res, next) => {
        if (!checkPermission(req, Permission.WORKBOOK_TEMPLATE_MANAGEMENT)) {
            return next(error.api.NO_PERMISSION);
        }
        const groupNumber = req.session.user.groupNumber;
        const name = req.params.name;
        if (!name) {
            return next({status: 400, message: 'package name can not be empty.'});
        }
        try {
            const dbPackage = await Package.findOneAndDelete({name, groupNumber});
            if (!dbPackage) {
                return res.json({success: true, message: `Package (${name}) does not exist.`});
            }
            await PackageValue.deleteMany({package: dbPackage._id, organization: {$in: dbPackage.organizations}});
            return res.json({success: true, message: `Package (${name}) deleted.`});
        } catch (e) {
            next(e);
        }
    },

    adminCreatePackage: async (req, res, next) => {
        if (!checkPermission(req, Permission.PACKAGE_MANAGEMENT)) {
            return next(error.api.NO_PERMISSION);
        }
        const groupNumber = req.session.user.groupNumber;
        const {
            name, published = false, orgIds = [], workbookIds = [], startDate, endDate, adminNotes = '',
            adminFiles
        } = req.body;
        if (!startDate || !endDate) {
            return next({status: 400, message: 'startDate and endDate can not be empty.'});
        }
        if (startDate > endDate) {
            return next({status: 400, message: 'startDate must be less or equal to endDate.'});
        }
        if (!name) {
            return next({status: 400, message: 'package must have a name.'});
        }
        const organizations = [], workbooks = []; // filtered
        try {
            const pkg = await Package.findOne({groupNumber, name});

            // check if package is already exists
            if (pkg) return next({status: 400, message: `Package (${name}) already exists.`});

            const packageId = mongoose.Types.ObjectId();

            // filter organizations
            const orgDocs = await Organization.find({'_id': {$in: orgIds}}, '_id users').populate('users');
            orgDocs.forEach(user => organizations.push(user._id));

            // filter workbooks
            const workbookDocs = await Workbook.find({'_id': {$in: workbookIds}});
            workbookDocs.forEach(workbook => workbooks.push(workbook._id));

            // collect values from all workbooks
            const valuesInAllWorkbook = {};
            workbookDocs.forEach(({values}) => {
                // the values should not contain readonly values.
                for (const catId in values) {
                    let atts = valuesInAllWorkbook[catId];
                    if (!atts) atts = valuesInAllWorkbook[catId] = {};
                    const originalAtts = values[catId];
                    for (const attId in originalAtts) {
                        atts[attId] = originalAtts[attId];
                    }
                }
            });

            // find organization values
            const valueDocs = await Value.find({groupNumber, organizations: {$in: organizations}});
            for (const valueDoc of valueDocs) {
                const {organization, values} = valueDoc;
                // remove this organization in orgs
                organizations.filter(item => !organization.equals(item));
                // fill in the non-existed values
                for (const catId in valuesInAllWorkbook) {
                    let atts = values[catId];
                    if (!atts) atts = values[catId] = {};
                    const attsInWorkbook = valuesInAllWorkbook[catId];
                    for (const attId in attsInWorkbook) {
                        if (atts[attId] == null) atts[attId] = attsInWorkbook[attId];
                    }
                }
                // create PackageValue
                const packageValue = new PackageValue({groupNumber, package: packageId, organization, values});
                await packageValue.save();
            }

            for (const organization of organizations) {
                // create PackageValue for the remaining organizations
                const packageValue = new PackageValue({
                    groupNumber, package: packageId, organization, values: valuesInAllWorkbook
                });
                await packageValue.save();
            }

            const newPackage = new Package({
                name, published, organizations, workbooks, startDate, endDate, adminNotes, adminFiles,
                groupNumber, _id: packageId
            });
            await newPackage.save();
            return res.json({success: true, message: `package (${name}) saved.`});
        } catch (e) {
            next(e);
        }
    },

    userGetWorkbook: async (req, res, next) => {
        const {packageName, name} = req.params;
        const groupNumber = req.session.user.groupNumber;
        const currentUserId = req.session.user._id;
        try {
            let {workbook, organizations} = await userGetPackageAndWorkbook(next, currentUserId, groupNumber, packageName, name);
            workbook = await Workbook.findById(workbook._id, 'file name roAtts roCats').populate('sheets');
            const populate = [];
            let values = await PackageValue.findOne({groupNumber, organization: organizations[0]});
            values = values ? values.values : {};
            workbook.sheets.forEach((sheet, idx) => {
                if (!sheet.row2Cat || !sheet.col2Att) return;
                const rows = populate[idx] = {};
                for (let row in sheet.row2Cat) {
                    const catId = sheet.row2Cat[row];
                    if (!values[catId]) continue;
                    if (!rows[row]) rows[row] = {};
                    for (let col in sheet.col2Att) {
                        const attId = sheet.col2Att[col];
                        if (values[catId][attId] == null) continue;
                        rows[row][col] = values[catId][attId];
                    }
                }
            });
            workbook.sheets = undefined;
            return res.json({success: true, workbook, populate});
        } catch (e) {
            next(e);
        }
    },

    userSaveWorkbook: async (req, res, next) => {
        const {packageName, name} = req.params;
        const groupNumber = req.session.user.groupNumber;
        const currentUserId = req.session.user._id;
        const {values} = req.body;
        try {
            let {workbook, pack, organizations} = await userGetPackageAndWorkbook(next, currentUserId, groupNumber, packageName, name);
            workbook = await Workbook.findById(workbook._id).populate('sheets');
            let doc = await PackageValue.findOne({groupNumber, organization: organizations[0]});
            if (!doc)
                doc = new PackageValue({
                    groupNumber, package: pack._id, organization: organizations[0], values: {}
                });
            const data = doc.values;
            for (let catId in values) {
                const atts = values[catId];
                if (Object.keys(atts).length === 0) continue;
                if (!data[catId]) data[catId] = {};
                for (let attId in atts) {
                    data[catId][attId] = atts[attId];
                }
            }
            doc.markModified('values');
            await doc.save();
            return res.json({success: true, message: `Workbook (${workbook.name}) updated.`});
        } catch (e) {
            next(e);
        }
    },

    userSubmitPackage: async (req, res, next) => {
        const {packageName} = req.params;

    },
};
