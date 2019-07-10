const express = require('express');
const router = express.Router();
const {attributeController} = require('../../controller/v2');
const {
    addAttribute, getAttributes, generateAttributeId, deleteAttribute, modifyAttributeGroup, deleteAttributeGroup,
    getAttributeGroup,
} = attributeController;

router.get('/api/v2/attribute', getAttributes);

router.post('/api/v2/attribute', addAttribute);

router.delete('/api/v2/attribute', deleteAttribute);

router.get('/api/v2/attribute/generate/id', generateAttributeId);

// Modify attribute groups
router.post('/api/v2/attribute/group', modifyAttributeGroup);

// delete attribute group
router.delete('/api/v2/attribute/group/:_id', deleteAttributeGroup);

// Get attribute groups
router.get('/api/v2/attribute/group', getAttributeGroup);

module.exports = router;
