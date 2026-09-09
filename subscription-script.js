// Store selected plan information
let selectedPlan = null;
let selectedBilling = null;

// Plan details with pricing
const planDetails = {
    personal: {
        name: 'Personal Plan',
        monthly: {
            price: 1000,
            currency: 'DZD',
            period: 'month',
            users: 1
        },
        yearly: {
            price: 10000,
            currency: 'DZD',
            period: 'year',
            users: 1,
            savings: 2000
        }
    },
    family: {
        name: 'Family Plan',
        monthly: {
            price: 3500,
            currency: 'DZD',
            period: 'month',
            users: 5
        },
        yearly: {
            price: 35000,
            currency: 'DZD',
            period: 'year',
            users: 5,
            savings: 7000
        }
    },
    business: {
        name: 'Business Plan',
        custom: {
            price: 'Custom',
            currency: 'DZD',
            period: 'based on team size',
            users: 'Custom'
        }
    }
};

// Function to handle plan selection
function selectPlan(plan, billing) {
    selectedPlan = plan;
    selectedBilling = billing;
    
    // Get plan details
    const details = planDetails[plan][billing];
    
    // Build modal message
    let message = '';
    
    if (plan === 'business') {
        message = `You've selected the <strong>${planDetails[plan].name}</strong>.<br><br>
                   Our sales team will contact you to discuss your specific needs and provide a custom quote.<br><br>
                   Features include custom user access, voice-to-text, sign language detection, 
                   sign language to audio, 24/7 support, unlimited storage, API access, and advanced analytics.`;
    } else {
        const priceText = typeof details.price === 'number' 
            ? `${details.price.toLocaleString()} ${details.currency}` 
            : details.price;
        
        const savingsText = details.savings 
            ? `<br><span style="color: var(--success);">💰 You'll save ${details.savings.toLocaleString()} DZD!</span>` 
            : '';
        
        message = `You've selected the <strong>${planDetails[plan].name}</strong>.<br><br>
                   <strong>Price:</strong> ${priceText} per ${details.period}<br>
                   <strong>Users:</strong> ${details.users} ${details.users === 1 ? 'person' : 'people'}${savingsText}<br><br>
                   Features include voice-to-text conversion, sign language detection, and sign language to audio conversion.`;
    }
    
    // Show modal
    document.getElementById('modalText').innerHTML = message;
    document.getElementById('confirmModal').style.display = 'block';
    
    // Add animation
    const modalContent = document.querySelector('.modal-content');
    modalContent.style.animation = 'none';
    setTimeout(() => {
        modalContent.style.animation = 'slideIn 0.3s ease';
    }, 10);
}

// Function to close modal
function closeModal() {
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'none';
    selectedPlan = null;
    selectedBilling = null;
}

// Function to confirm subscription
function confirmSubscription() {
    if (!selectedPlan || !selectedBilling) {
        alert('Please select a plan first.');
        return;
    }
    
    // Show success message
    const modal = document.getElementById('confirmModal');
    const modalText = document.getElementById('modalText');
    
    if (selectedPlan === 'business') {
        modalText.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📧</div>
                <h3 style="color: var(--success); margin-bottom: 1rem;">Request Sent!</h3>
                <p>Thank you for your interest in our Business Plan. Our sales team will contact you within 24 hours.</p>
            </div>
        `;
    } else {
        modalText.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
                <h3 style="color: var(--success); margin-bottom: 1rem;">Subscription Confirmed!</h3>
                <p>Thank you for subscribing to the ${planDetails[selectedPlan].name}. 
                You will receive a confirmation email shortly with payment instructions.</p>
            </div>
        `;
    }
    
    // Hide buttons
    document.querySelector('.modal-buttons').style.display = 'none';
    
    // Auto close after 3 seconds
    setTimeout(() => {
        closeModal();
        document.querySelector('.modal-buttons').style.display = 'flex';
    }, 3000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('confirmModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Close modal on ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add animation on scroll for cards
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all pricing cards
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.pricing-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });
});

// Add billing toggle functionality (optional enhancement)
function createBillingToggle() {
    const header = document.querySelector('.header');
    const toggleHTML = `
        <div class="billing-toggle" style="margin-top: 2rem;">
            <button class="toggle-btn active" id="monthlyToggle" onclick="toggleBilling('monthly')">
                Monthly
            </button>
            <button class="toggle-btn" id="yearlyToggle" onclick="toggleBilling('yearly')">
                Yearly <span style="color: var(--success); font-size: 0.8rem;">(Save up to 16%)</span>
            </button>
        </div>
    `;
    
    // Uncomment to add billing toggle
    // header.insertAdjacentHTML('beforeend', toggleHTML);
}

// Function to toggle between monthly and yearly pricing
function toggleBilling(period) {
    const monthlyBtn = document.getElementById('monthlyToggle');
    const yearlyBtn = document.getElementById('yearlyToggle');
    
    if (period === 'monthly') {
        monthlyBtn.classList.add('active');
        yearlyBtn.classList.remove('active');
    } else {
        yearlyBtn.classList.add('active');
        monthlyBtn.classList.remove('active');
    }
    
    // Here you would update the pricing display
    // This is a placeholder for future enhancement
}

console.log('Subscription page loaded successfully!');
console.log('Features: Voice-to-Text, Sign Language Detection, Sign Language to Audio');
