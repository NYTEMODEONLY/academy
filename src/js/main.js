// NYTEMODE Academy - Main JavaScript

// Mobile menu toggle
const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.querySelector('[data-mobile-menu]');

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
  });
}

// Category filter
const filterButtons = document.querySelectorAll('[data-filter]');
const filterableItems = document.querySelectorAll('[data-category]');

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;

    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    filterableItems.forEach(item => {
      if (filter === 'all' || item.dataset.category === filter) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  });
});

// Accordion
document.querySelectorAll('[data-accordion-trigger]').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.accordion-item');
    const content = trigger.nextElementSibling;
    const isOpen = content.classList.contains('open');

    // Close all
    document.querySelectorAll('.accordion-content').forEach(c => {
      c.classList.remove('open');
    });
    document.querySelectorAll('.accordion-item').forEach(i => {
      i.classList.remove('open');
    });

    // Open clicked if it was closed
    if (!isOpen) {
      content.classList.add('open');
      item.classList.add('open');
    }
  });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth'
      });
    }
  });
});

// Close mobile menu when clicking a link
if (mobileMenu) {
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('active');
    });
  });
}

// Add fade-in animation on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.card, .course-card, .news-card, .stat-card').forEach(el => {
  el.style.opacity = '0';
  observer.observe(el);
});
