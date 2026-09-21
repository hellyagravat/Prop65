// ============================================
// PROP65 SHIELD
// AUTHENTICATION
// ============================================
//
// This file works with the existing auth.html.
//
// IMPORTANT:
// Supabase is created ONLY in:
//     js/supabase-config.js
//
// It is available as:
//     window.supabaseClient
//
// Do not create another Supabase client here.
// ============================================


// ============================================
// ELEMENT HELPERS
// ============================================

function getElement(id) {
    return document.getElementById(id);
}


// ============================================
// MESSAGE
// ============================================

function showAuthMessage(message, type = '') {

    const messageElement = getElement('auth-message');

    if (!messageElement) {
        console.log(message);
        return;
    }

    messageElement.textContent = message;

    if (type) {
        messageElement.className =
            `auth-message ${type}`;
    } else {
        messageElement.className =
            'auth-message';
    }
}


// ============================================
// BUTTON LOADING STATE
// ============================================

function setButtonLoading(button, loading, loadingText = 'Please wait...') {

    if (!button) {
        return;
    }

    if (loading) {

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            loadingText;

        button.disabled = true;

    } else {

        button.textContent =
            button.dataset.originalText || button.textContent;

        button.disabled = false;
    }
}


// ============================================
// SHOW LOGIN PANEL
// ============================================

function showLoginPanel() {

    const loginPanel = getElement('login-panel');
    const signupPanel = getElement('signup-panel');
    const forgotPanel = getElement('forgot-panel');
    const resetPanel = getElement('reset-panel');

    const loginMode = getElement('mode-login');
    const signupMode = getElement('mode-signup');

    if (loginPanel) {
        loginPanel.hidden = false;
    }

    if (signupPanel) {
        signupPanel.hidden = true;
    }

    if (forgotPanel) {
        forgotPanel.hidden = true;
    }

    if (resetPanel) {
        resetPanel.hidden = true;
    }

    if (loginMode) {
        loginMode.classList.add('active');
    }

    if (signupMode) {
        signupMode.classList.remove('active');
    }

    showAuthMessage('');
}


// ============================================
// SHOW SIGNUP PANEL
// ============================================

function showSignupPanel() {

    const loginPanel = getElement('login-panel');
    const signupPanel = getElement('signup-panel');
    const forgotPanel = getElement('forgot-panel');
    const resetPanel = getElement('reset-panel');

    const loginMode = getElement('mode-login');
    const signupMode = getElement('mode-signup');

    if (loginPanel) {
        loginPanel.hidden = true;
    }

    if (signupPanel) {
        signupPanel.hidden = false;
    }

    if (forgotPanel) {
        forgotPanel.hidden = true;
    }

    if (resetPanel) {
        resetPanel.hidden = true;
    }

    if (loginMode) {
        loginMode.classList.remove('active');
    }

    if (signupMode) {
        signupMode.classList.add('active');
    }

    showAuthMessage('');
}


// ============================================
// SHOW FORGOT PASSWORD PANEL
// ============================================

function showForgotPanel() {

    const loginPanel = getElement('login-panel');
    const signupPanel = getElement('signup-panel');
    const forgotPanel = getElement('forgot-panel');
    const resetPanel = getElement('reset-panel');

    const loginMode = getElement('mode-login');
    const signupMode = getElement('mode-signup');

    if (loginPanel) {
        loginPanel.hidden = true;
    }

    if (signupPanel) {
        signupPanel.hidden = true;
    }

    if (forgotPanel) {
        forgotPanel.hidden = false;
    }

    if (resetPanel) {
        resetPanel.hidden = true;
    }

    if (loginMode) {
        loginMode.classList.remove('active');
    }

    if (signupMode) {
        signupMode.classList.remove('active');
    }

    showAuthMessage('');
}


// ============================================
// SHOW RESET PASSWORD PANEL
// ============================================

function showResetPanel() {

    const loginPanel = getElement('login-panel');
    const signupPanel = getElement('signup-panel');
    const forgotPanel = getElement('forgot-panel');
    const resetPanel = getElement('reset-panel');

    const loginMode = getElement('mode-login');
    const signupMode = getElement('mode-signup');

    if (loginPanel) {
        loginPanel.hidden = true;
    }

    if (signupPanel) {
        signupPanel.hidden = true;
    }

    if (forgotPanel) {
        forgotPanel.hidden = true;
    }

    if (resetPanel) {
        resetPanel.hidden = false;
    }

    if (loginMode) {
        loginMode.classList.remove('active');
    }

    if (signupMode) {
        signupMode.classList.remove('active');
    }

    showAuthMessage('');
}


// ============================================
// CHECK EXISTING SESSION
// ============================================

async function checkExistingSession() {

    if (!window.supabaseClient) {

        console.error(
            'Supabase client is not initialized.'
        );

        showAuthMessage(
            'Supabase could not be initialized. Please check your configuration.',
            'error'
        );

        return;
    }

    try {

        const {
            data,
            error
        } =
            await window.supabaseClient.auth.getSession();

        if (error) {

            console.error(
                'Session check error:',
                error
            );

            return;
        }

        if (data.session) {

            console.log(
                'Existing session found.'
            );

            window.location.href =
                'dashboard.html';
        }

    } catch (error) {

        console.error(
            'Unexpected session error:',
            error
        );
    }
}


// ============================================
// SIGN UP
// ============================================

async function signUp(email, password) {

    const signupForm =
        getElement('signup-form');

    const submitButton =
        signupForm
            ? signupForm.querySelector('.submit')
            : null;

    setButtonLoading(
        submitButton,
        true,
        'Creating account...'
    );

    showAuthMessage(
        'Creating your account...',
        ''
    );

    try {

        const {
            data,
            error
        } =
            await window.supabaseClient.auth.signUp({
                email: email,
                password: password
            });

        if (error) {

            console.error(
                'Signup error:',
                error
            );

            showAuthMessage(
                error.message,
                'error'
            );

            return;
        }

        console.log(
            'Signup response:',
            data
        );


        // ----------------------------------------
        // Email confirmation enabled
        // ----------------------------------------

        if (
            data.user &&
            !data.session
        ) {

            showAuthMessage(
                'Account created! Please check your email and verify your account before signing in.',
                'success'
            );

            return;
        }


        // ----------------------------------------
        // Email confirmation disabled
        // ----------------------------------------

        if (data.session) {

            showAuthMessage(
                'Account created successfully. Redirecting...',
                'success'
            );

            setTimeout(
                function () {
                    window.location.href =
                        'dashboard.html';
                },
                500
            );

            return;
        }


        showAuthMessage(
            'Account created successfully. Please check your email.',
            'success'
        );

    } catch (error) {

        console.error(
            'Unexpected signup error:',
            error
        );

        showAuthMessage(
            'Something went wrong while creating your account.',
            'error'
        );

    } finally {

        setButtonLoading(
            submitButton,
            false
        );
    }
}


// ============================================
// LOGIN
// ============================================

async function login(email, password) {

    const loginForm =
        getElement('login-form');

    const submitButton =
        loginForm
            ? loginForm.querySelector('.submit')
            : null;

    setButtonLoading(
        submitButton,
        true,
        'Signing in...'
    );

    showAuthMessage(
        'Signing you in...',
        ''
    );

    try {

        const {
            data,
            error
        } =
            await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {

            console.error(
                'Login error:',
                error
            );

            showAuthMessage(
                error.message,
                'error'
            );

            return;
        }

        console.log(
            'Login successful:',
            data
        );


        if (data.session) {

            showAuthMessage(
                'Signed in successfully. Redirecting...',
                'success'
            );

            setTimeout(
                function () {
                    window.location.href =
                        'dashboard.html';
                },
                300
            );

            return;
        }

        showAuthMessage(
            'Login completed, but no session was created.',
            'error'
        );

    } catch (error) {

        console.error(
            'Unexpected login error:',
            error
        );

        showAuthMessage(
            'Something went wrong while signing in.',
            'error'
        );

    } finally {

        setButtonLoading(
            submitButton,
            false
        );
    }
}


// ============================================
// SEND PASSWORD RESET EMAIL
// ============================================

async function sendPasswordReset(email) {

    const forgotForm =
        getElement('forgot-form');

    const submitButton =
        forgotForm
            ? forgotForm.querySelector('.submit')
            : null;

    setButtonLoading(
        submitButton,
        true,
        'Sending...'
    );

    showAuthMessage(
        'Sending password reset link...',
        ''
    );

    try {

        // IMPORTANT:
        // Use the exact current page URL.
        // Supabase must allow this URL in:
        // Authentication → URL Configuration.

        const redirectUrl =
            window.location.href.split('#')[0];

        const {
            error
        } =
            await window.supabaseClient.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo: redirectUrl
                }
            );

        if (error) {

            console.error(
                'Password reset error:',
                error
            );

            showAuthMessage(
                error.message,
                'error'
            );

            return;
        }

        showAuthMessage(
            'Password reset email sent. Please check your inbox.',
            'success'
        );

    } catch (error) {

        console.error(
            'Unexpected password reset error:',
            error
        );

        showAuthMessage(
            'Something went wrong while sending the reset email.',
            'error'
        );

    } finally {

        setButtonLoading(
            submitButton,
            false
        );
    }
}


// ============================================
// UPDATE PASSWORD
// ============================================

async function updatePassword(
    password,
    confirmPassword
) {

    const resetForm =
        getElement('reset-form');

    const submitButton =
        resetForm
            ? resetForm.querySelector('.submit')
            : null;

    if (password !== confirmPassword) {

        showAuthMessage(
            'Passwords do not match.',
            'error'
        );

        return;
    }

    if (password.length < 6) {

        showAuthMessage(
            'Password must contain at least 6 characters.',
            'error'
        );

        return;
    }

    setButtonLoading(
        submitButton,
        true,
        'Updating...'
    );

    showAuthMessage(
        'Updating your password...',
        ''
    );

    try {

        const {
            error
        } =
            await window.supabaseClient.auth.updateUser({
                password: password
            });

        if (error) {

            console.error(
                'Password update error:',
                error
            );

            showAuthMessage(
                error.message,
                'error'
            );

            return;
        }

        showAuthMessage(
            'Password updated successfully. You can now sign in.',
            'success'
        );

        // Clear the form.
        resetForm.reset();

        // Return to login after a short delay.
        setTimeout(
            function () {

                window.location.hash = '';

                showLoginPanel();

            },
            1500
        );

    } catch (error) {

        console.error(
            'Unexpected password update error:',
            error
        );

        showAuthMessage(
            'Something went wrong while updating your password.',
            'error'
        );

    } finally {

        setButtonLoading(
            submitButton,
            false
        );
    }
}


// ============================================
// INITIALIZE AUTHENTICATION
// ============================================

document.addEventListener(
    'DOMContentLoaded',
    function () {

        console.log(
            'Prop65 Shield authentication initializing...'
        );


        // ----------------------------------------
        // Check Supabase
        // ----------------------------------------

        if (!window.supabaseClient) {

            console.error(
                'Supabase client not found.'
            );

            showAuthMessage(
                'Supabase could not be initialized.',
                'error'
            );

            return;
        }

        console.log(
            'Supabase client found.'
        );


        // ----------------------------------------
        // Existing session
        // ----------------------------------------

        checkExistingSession();


        // ========================================
        // SIGN IN / CREATE ACCOUNT TABS
        // ========================================

        const loginMode =
            getElement('mode-login');

        const signupMode =
            getElement('mode-signup');


        if (loginMode) {

            loginMode.addEventListener(
                'click',
                function () {

                    showLoginPanel();

                }
            );
        }


        if (signupMode) {

            signupMode.addEventListener(
                'click',
                function () {

                    showSignupPanel();

                }
            );
        }


        // ========================================
        // LOGIN FORM
        // ========================================

        const loginForm =
            getElement('login-form');

        if (loginForm) {

            loginForm.addEventListener(
                'submit',
                async function (event) {

                    event.preventDefault();

                    const emailInput =
                        getElement('login-email');

                    const passwordInput =
                        getElement('login-password');

                    if (!emailInput ||
                        !passwordInput) {

                        console.error(
                            'Login fields not found.'
                        );

                        return;
                    }


                    const email =
                        emailInput.value.trim();

                    const password =
                        passwordInput.value;


                    if (!email ||
                        !password) {

                        showAuthMessage(
                            'Please enter your email and password.',
                            'error'
                        );

                        return;
                    }


                    await login(
                        email,
                        password
                    );

                }
            );
        }


        // ========================================
        // SIGNUP FORM
        // ========================================

        const signupForm =
            getElement('signup-form');

        if (signupForm) {

            signupForm.addEventListener(
                'submit',
                async function (event) {

                    event.preventDefault();

                    const emailInput =
                        getElement('signup-email');

                    const passwordInput =
                        getElement('signup-password');

                    const confirmPasswordInput =
                        getElement(
                            'signup-confirm-password'
                        );


                    if (!emailInput ||
                        !passwordInput ||
                        !confirmPasswordInput) {

                        console.error(
                            'Signup fields not found.'
                        );

                        return;
                    }


                    const email =
                        emailInput.value.trim();

                    const password =
                        passwordInput.value;

                    const confirmPassword =
                        confirmPasswordInput.value;


                    // --------------------------------
                    // Validation
                    // --------------------------------

                    if (!email) {

                        showAuthMessage(
                            'Please enter your email address.',
                            'error'
                        );

                        emailInput.focus();

                        return;
                    }


                    if (!password) {

                        showAuthMessage(
                            'Please enter a password.',
                            'error'
                        );

                        passwordInput.focus();

                        return;
                    }


                    if (password.length < 6) {

                        showAuthMessage(
                            'Password must contain at least 6 characters.',
                            'error'
                        );

                        passwordInput.focus();

                        return;
                    }


                    if (!confirmPassword) {

                        showAuthMessage(
                            'Please confirm your password.',
                            'error'
                        );

                        confirmPasswordInput.focus();

                        return;
                    }


                    if (
                        password !==
                        confirmPassword
                    ) {

                        showAuthMessage(
                            'Passwords do not match.',
                            'error'
                        );

                        confirmPasswordInput.focus();

                        return;
                    }


                    await signUp(
                        email,
                        password
                    );

                }
            );
        }


        // ========================================
        // FORGOT PASSWORD LINK
        // ========================================

        const forgotLink =
            getElement('forgot-link');

        if (forgotLink) {

            forgotLink.addEventListener(
                'click',
                function (event) {

                    event.preventDefault();

                    showForgotPanel();

                }
            );
        }


        // ========================================
        // FORGOT PASSWORD FORM
        // ========================================

        const forgotForm =
            getElement('forgot-form');

        if (forgotForm) {

            forgotForm.addEventListener(
                'submit',
                async function (event) {

                    event.preventDefault();

                    const emailInput =
                        getElement('forgot-email');

                    if (!emailInput) {

                        console.error(
                            'Forgot password email field not found.'
                        );

                        return;
                    }


                    const email =
                        emailInput.value.trim();


                    if (!email) {

                        showAuthMessage(
                            'Please enter your account email.',
                            'error'
                        );

                        emailInput.focus();

                        return;
                    }


                    await sendPasswordReset(
                        email
                    );

                }
            );
        }


        // ========================================
        // BACK TO LOGIN
        // ========================================

        const backToLogin =
            getElement('back-to-login');

        if (backToLogin) {

            backToLogin.addEventListener(
                'click',
                function (event) {

                    event.preventDefault();

                    showLoginPanel();

                }
            );
        }


        // ========================================
        // RESET PASSWORD FORM
        // ========================================

        const resetForm =
            getElement('reset-form');

        if (resetForm) {

            resetForm.addEventListener(
                'submit',
                async function (event) {

                    event.preventDefault();

                    const passwordInput =
                        getElement(
                            'reset-password'
                        );

                    const confirmPasswordInput =
                        getElement(
                            'reset-confirm-password'
                        );


                    if (!passwordInput ||
                        !confirmPasswordInput) {

                        console.error(
                            'Reset password fields not found.'
                        );

                        return;
                    }


                    const password =
                        passwordInput.value;

                    const confirmPassword =
                        confirmPasswordInput.value;


                    await updatePassword(
                        password,
                        confirmPassword
                    );

                }
            );
        }


        // ========================================
        // DETECT PASSWORD RESET SESSION
        // ========================================

        window.supabaseClient.auth.onAuthStateChange(
            function (event, session) {

                console.log(
                    'Supabase auth event:',
                    event
                );


                // Supabase sends PASSWORD_RECOVERY
                // when the user opens the reset link.

                if (
                    event ===
                    'PASSWORD_RECOVERY'
                ) {

                    showResetPanel();

                    return;
                }


                // Normal successful login/signup.
                if (
                    event ===
                    'SIGNED_IN' &&
                    session
                ) {

                    // Don't redirect during
                    // password recovery.
                    if (
                        window.location.hash
                            .includes('type=recovery')
                    ) {
                        return;
                    }
                }

            }
        );


        // ========================================
        // HANDLE PASSWORD RECOVERY URL
        // ========================================

        if (
            window.location.hash
                .includes('type=recovery')
        ) {

            showResetPanel();

        }


        console.log(
            'Authentication initialized successfully.'
        );

    }
);