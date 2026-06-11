document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. MOBILE NAVIGATION ---
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const navMenu = document.getElementById("navMenu");
    const navItems = document.querySelectorAll(".nav-item");

    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener("click", () => {
            hamburgerBtn.classList.toggle("active");
            navMenu.classList.toggle("active");
        });
        
        // Close menu when a navigation item is clicked
        navItems.forEach(item => {
            item.addEventListener("click", () => {
                hamburgerBtn.classList.remove("active");
                navMenu.classList.remove("active");
            });
        });
    }

    // --- 2. REVIEW CAROUSEL ---
    const slides = document.querySelectorAll(".review-slide");
    const dots = document.querySelectorAll(".dot");
    let currentSlide = 0;
    let slideInterval;

    function showSlide(index) {
        if (slides.length === 0) return;
        
        // Reset active classes
        slides.forEach(slide => slide.classList.remove("active"));
        dots.forEach(dot => dot.classList.remove("active"));

        // Boundary check
        currentSlide = (index + slides.length) % slides.length;

        // Apply active class
        slides[currentSlide].classList.add("active");
        dots[currentSlide].classList.add("active");
    }

    function startSlideShow() {
        if (slides.length <= 1) return;
        slideInterval = setInterval(() => {
            showSlide(currentSlide + 1);
        }, 6000); // Rotate review every 6 seconds
    }

    function resetSlideShow() {
        clearInterval(slideInterval);
        startSlideShow();
    }

    // Dot navigation
    dots.forEach((dot, idx) => {
        dot.addEventListener("click", () => {
            showSlide(idx);
            resetSlideShow();
        });
    });

    // Initialize slide show
    if (slides.length > 0) {
        showSlide(0);
        startSlideShow();
    }

    // --- 3. CUSTOM PLACEHOLDER MODAL ---
    const placeholderModal = document.getElementById("placeholderModal");
    const modalCloseBtn = document.getElementById("modalCloseBtn");
    const modalCloseBtnOk = document.getElementById("modalCloseBtnOk");
    const triggers = document.querySelectorAll(".placeholder-trigger");

    function openModal(e) {
        e.preventDefault();
        if (placeholderModal) {
            placeholderModal.classList.add("active");
            document.body.style.overflow = "hidden"; // Prevent background scroll
        }
    }

    function closeModal() {
        if (placeholderModal) {
            placeholderModal.classList.remove("active");
            document.body.style.overflow = ""; // Restore scroll
        }
    }

    triggers.forEach(trigger => {
        trigger.addEventListener("click", openModal);
    });

    if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
    if (modalCloseBtnOk) modalCloseBtnOk.addEventListener("click", closeModal);
    
    // Close modal when clicking on the overlay background
    if (placeholderModal) {
        placeholderModal.addEventListener("click", (e) => {
            if (e.target === placeholderModal) {
                closeModal();
            }
        });
    }

    // Close modal on escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeModal();
        }
    });

    // --- 4. SCROLL REVEAL ANIMATION ---
    const revealElements = document.querySelectorAll(".scroll-reveal");

    if ("IntersectionObserver" in window) {
        const observerOptions = {
            root: null,
            rootMargin: "0px",
            threshold: 0.15 // Trigger when 15% of the element is visible
        };

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("revealed");
                    observer.unobserve(entry.target); // Stop observing after reveal
                }
            });
        }, observerOptions);

        revealElements.forEach(element => {
            revealObserver.observe(element);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        revealElements.forEach(element => {
            element.classList.add("revealed");
        });
    }
});
