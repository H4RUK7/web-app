export function initForms() {
    const newsletterForm = document.getElementById('newsletter-form');
    const searchForm = document.getElementById('search-form');
    const emailInput = document.getElementById('newsletter-email');
    const errorDiv = document.getElementById('newsletter-error');

    emailInput.addEventListener('input', () => {
        if (emailInput.value && !/^\S+@\S+\.\S+$/.test(emailInput.value)) {
            errorDiv.textContent = 'Please enter a valid email.';
            errorDiv.classList.remove('hidden');
        } else {
            errorDiv.textContent = '';
            errorDiv.classList.add('hidden');
        }
    });

    newsletterForm.addEventListener('submit', async e => {
        e.preventDefault();
        const email = emailInput.value;

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            errorDiv.textContent = 'Please enter a valid email.';
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!response.ok) throw new Error('Subscription failed');
            alert('Subscribed successfully!');
            newsletterForm.reset();
            errorDiv.classList.add('hidden');
        } catch {
            errorDiv.textContent = 'Subscription failed. Try again.';
            errorDiv.classList.remove('hidden');
        }
    });

    searchForm.addEventListener('submit', e => {
        e.preventDefault();
        // Handled by input event in main.js
    });
}