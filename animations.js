import { gsap } from 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';

export function animateProducts() {
    gsap.from('.product-card', {
        opacity: 0,
        y: 50,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
    });
}

export function animateModal(modal) {
    gsap.from(modal, {
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
        ease: 'power2.out',
    });
}

export function animateOnHover(element) {
    gsap.to(element, {
        scale: 1.03,
        duration: 0.3,
        ease: 'power2.out',
    });
}

export function resetHover(element) {
    gsap.to(element, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
    });
}