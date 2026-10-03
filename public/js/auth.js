document.addEventListener('DOMContentLoaded', function () {
    // 1. Logic ẩn/hiện mật khẩu
    document.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var input = document.querySelector(btn.dataset.togglePassword);
            if (!input) return;
            var show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
            btn.firstElementChild.className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
        });
    });

    // 2. Logic kiểm tra xác nhận mật khẩu
    var form = document.querySelector('form');
    var password = document.getElementById('password');
    var confirmPassword = document.getElementById('confirmPassword');

    function checkPasswordMatch() {
        var passVal = password.value;
        var confirmVal = confirmPassword.value;

        if (!confirmVal) {
            confirmPassword.setCustomValidity('');
            return;
        }

        if (passVal !== confirmVal) {
            confirmPassword.setCustomValidity('Mật khẩu xác nhận không khớp');
        } else {
            confirmPassword.setCustomValidity('');
        }
    }

    password.addEventListener('input', checkPasswordMatch);
    confirmPassword.addEventListener('input', checkPasswordMatch);

    form.addEventListener('submit', function (e) {
        if (password.value !== confirmPassword.value) {
            e.preventDefault()
            confirmPassword.reportValidity(); 
            confirmPassword.focus();
        }
    });
});