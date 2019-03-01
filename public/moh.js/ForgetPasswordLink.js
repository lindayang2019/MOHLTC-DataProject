$("#resetPasswordForm").submit(function(e) {
    e.preventDefault();
    hideAlert();
    hideErrorAlert();
   // $username = $('#username').val();
    // $('#resetPasswordForm').append($username);
    $.ajax({
        url: '/api/reset-password-link',
        type: 'POST',
        data: $('#resetPasswordForm').serialize()
    }).done(function (response) {
        if(response.success) {
            console.log(response);
            showAlert(response.message);
        }
        if (!response.success) {
            console.log(response);
            showErrorAlert(response.message);
        }
    }).fail(function(xhr, status, error) {
        console.log('fail');
        showErrorAlert(xhr.responseJSON.message);
    });
});


function showErrorAlert(msg) {
    $('#alert-error-text').html(msg);
    $('#alert-error').fadeIn();
}

function showAlert(msg) {
    $('#alert-text').html(msg);
    $('#alert').fadeIn();
}

function hideErrorAlert() {
    $('#alert-error').fadeOut();
}

function hideAlert() {
    $('#alert').fadeOut();
}