document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contact-form');
    const successMessage = document.getElementById('form-success');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateForm()) {
            // Simulate form submission
            setTimeout(() => {
                form.reset();
                showSuccessMessage();
            }, 1000);
        }
    });

    function validateForm() {
        let isValid = true;
        const fields = [
            { id: 'name', errorId: 'name-error', message: 'Name is required' },
            { id: 'email', errorId: 'email-error', message: 'Valid email is required' },
            { id: 'subject', errorId: 'subject-error', message: 'Subject is required' },
            { id: 'message', errorId: 'message-error', message: 'Message is required' }
        ];

        fields.forEach(field => {
            const input = document.getElementById(field.id);
            const error = document.getElementById(field.errorId);
            error.classList.add('hidden');
            error.textContent = '';

            if (!input.value.trim()) {
                error.textContent = field.message;
                error.classList.remove('hidden');
                isValid = false;
            } else if (field.id === 'email' && !isValidEmail(input.value)) {
                error.textContent = 'Please enter a valid email address';
                error.classList.remove('hidden');
                isValid = false;
            }
        });

        return isValid;
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function showSuccessMessage() {
        successMessage.classList.remove('hidden');
        gsap.fromTo(successMessage, 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
        setTimeout(() => {
            gsap.to(successMessage, {
                opacity: 0,
                y: 20,
                duration: 0.5,
                ease: 'power2.in',
                onComplete: () => successMessage.classList.add('hidden')
            });
        }, 3000);
    }
});