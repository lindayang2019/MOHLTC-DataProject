"use strict";

$(document).ready(function () {
  loadWorkbooks();
});

function addslashes(str) {
  return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

function loadWorkbooks() {
  $.ajax({
    url: '/api/admin/workbooks',
    type: 'GET'
  }).done(function (response) {
    if (response.success) {
      console.log(response);
      var workbooks = response.workbooks;
      var container = $('#workbooks');
      container.html('');

      for (var i = 0; i < workbooks.length; i++) {
        var name = encodeURIComponent(workbooks[i].name);
        container.append('<span class="btn btn-outline-secondary-no-hover form-name-box mr-2">\n' + '<span class="fas fa-table"></span> ' + workbooks[i].name + '<a class="btn btn-outline-success ml-3" href="/edit-workbook-template/' + name + '">' + 'Edit</a> <a class="btn btn-outline-danger" href="#" onclick="deleteWorkbook(\'' + addslashes(name) + '\')"> Delete</a> </span>');
      }
    }
  }).fail(function (xhr, status, error) {
    console.log('fail');
    showModalAlert('Error', xhr.responseJSON.message);
  });
} // To-DO add confirmation dialog
// All filled workbooks will also be deleted.


function deleteWorkbook(name) {
  $.ajax({
    url: '/api/admin/workbook/',
    type: 'DELETE',
    data: {
      name: decodeURIComponent(name)
    }
  }).done(function (response) {
    if (response.success) {
      console.log(response);
      showAlert(response.message);
      loadWorkbooks();
    }
  }).fail(function (xhr, status, error) {
    console.log('fail');
    showModalAlert('Error', xhr.responseJSON.message);
  });
}

function showModalAlert(title, msg) {
  $('#msg-modal').find('h5').html(title).end().find('p').html(msg).end().modal('show');
}

function showAlert(msg) {
  $('#alert-text').html(msg);
  $('#alert').fadeIn();
}

function hideAlert() {
  $('#alert').fadeOut();
}
//# sourceMappingURL=manageWorkbookTemplates.js.map