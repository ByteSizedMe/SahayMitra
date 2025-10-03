// This file replaces the previous inline script in index.html
// All application logic is now modularized here.
import React from 'react';
import ReactDOM from 'react-dom';
import { GoogleGenAI, Type } from "@google/genai";

// --- Gemini AI Setup ---
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// --- DATA ---
const beneficiariesData = [
    { id: 101, name: 'Sunita Devi', kyc_complete: true, credit_score: 785, risk_band: 'Low Risk-High Need', shap: [{val:120, desc:'Consistent on-time repayment'}, {val:75, desc:'Stable electricity usage'}, {val:-15, desc:'Drop in mobile recharge'}], loan_details: { approved_limit: 50000, available_limit: 50000, utilized_amount: 0, last_payment_date: 'N/A', interest_rate: '1.5%', next_repayment_date: 'Aug 5', transaction_history: []}, achievements: { kyc: true, first_repayment: false, payment_streak: 0 }, impact_tokens: 125},
    { id: 102, name: 'Ramesh Kumar', kyc_complete: true, credit_score: 650, risk_band: 'High Risk-High Need', shap: [{val:80, desc:'Stable utility payments'}, {val:-40, desc:'Irregular repayment history'}, {val:-25, desc:'High loan-to-income ratio'}], loan_details: { approved_limit: 25000, available_limit: 10000, utilized_amount: 15000, last_payment_date: '2024-07-10', interest_rate: '1.8%', next_repayment_date: 'Aug 10', transaction_history: [{ date: '2024-07-10', desc: 'Repayment', debit: 0, credit: 1000, balance: 10000}]}, achievements: { kyc: true, first_repayment: true, payment_streak: 1 }, impact_tokens: 250},
    { id: 103, name: 'Priya Singh', kyc_complete: true, credit_score: 810, risk_band: 'Low Risk-Low Need', shap: [{val:150, desc:'Excellent repayment history'}, {val:90, desc:'Low loan-to-income ratio'}, {val:50, desc:'Consistent mobile usage'}], loan_details: { approved_limit: 75000, available_limit: 75000, utilized_amount: 0, last_payment_date: 'N/A', interest_rate: '1.2%', next_repayment_date: 'N/A', transaction_history: []}, achievements: { kyc: true, first_repayment: false, payment_streak: 0 }, impact_tokens: 50},
];

const communitiesData = [
    { name: "Green Valley Farmers", location: "Nashik, Maharashtra", purpose: "Agriculture", trustScore: 92 },
    { name: "Jaipur Artisans Collective", location: "Jaipur, Rajasthan", purpose: "Small Business", trustScore: 88 },
    { name: "Kolkata Education Fund", location: "Kolkata, West Bengal", purpose: "Education", trustScore: 95 },
    { name: "Mumbai Weavers Guild", location: "Mumbai, Maharashtra", purpose: "Handicrafts", trustScore: 91 },
    { name: "Bangalore Tech Innovators", location: "Bangalore, Karnataka", purpose: "Technology", trustScore: 98 },
    { name: "Chennai Fishing Cooperative", location: "Chennai, Tamil Nadu", purpose: "Fisheries", trustScore: 85 },
];


let currentUser = null;
let currentDashboardView = 'borrower'; // 'borrower' or 'lender'
let pendingApplications = [];

// --- ELEMENTS ---
const pages = document.querySelectorAll('.page');
const mainNav = document.getElementById('main-nav');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const toast = document.getElementById('toast');
const toastIcon = document.getElementById('toast-icon');
const toastMessage = document.getElementById('toast-message');
const appScroller = document.querySelector('.app-scroller');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userAvatar = document.getElementById('user-avatar');
const userNameDisplay = document.getElementById('user-name-display');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const chatSendBtn = document.getElementById('chat-send-btn');
const chatVoiceBtn = document.getElementById('chat-voice-btn');
const chatMuteBtn = document.getElementById('chat-mute-btn');
const thinkingIndicator = document.getElementById('thinking-indicator');
const dashboardContent = document.getElementById('dashboard-content');
const borrowerViewBtn = document.getElementById('borrower-view-btn');
const lenderViewBtn = document.getElementById('lender-view-btn');
const chooseImageBtn = document.getElementById('choose-image-btn');
const imageUploadInput = document.getElementById('image-upload-input') as HTMLInputElement;
const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
const imagePlaceholder = document.getElementById('image-placeholder');
const scanRecordBtn = document.getElementById('scan-record-btn') as HTMLButtonElement;
const scannerOutput = document.getElementById('scanner-output');
const scannerLoader = document.getElementById('scanner-loader');

// --- APP STATE & NAVIGATION ---
function navigateTo(pageId) {
    pages.forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        if(appScroller) appScroller.scrollTo(0, 0);
        if (pageId === 'apply-loan-page') {
            resetChat();
        }
        if (pageId === 'communities-page' && currentUser) {
            updateJoinedCommunityButtons();
        }
    }
}

function handleNavigation() {
    const hash = window.location.hash || '#landing';
    const pageId = (hash.substring(1) || 'landing') + '-page';
    const protectedPages = ['dashboard-page', 'ekyc-page'];
    
    if (protectedPages.includes(pageId) && !currentUser) {
        navigateTo('landing-page');
        window.location.hash = '#landing';
        showLoginModal();
        return;
    }

    navigateTo(pageId);
    
    // Update active nav link
    const navLinks = mainNav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const linkHash = new URL((link as HTMLAnchorElement).href).hash;
        if (linkHash === hash) {
            link.classList.add('active-nav');
        } else {
            link.classList.remove('active-nav');
        }
    });
}

// --- AUTHENTICATION ---
function showLoginModal() {
    const modalHtml = `
        <div class="space-y-4">
            <div>
                <label for="user-id" class="block text-sm font-medium text-gray-500">User ID</label>
                <input type="text" id="user-id" class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-light-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="e.g., sunita101 or lender01">
            </div>
            <p id="login-error" class="text-red-500 text-sm h-4"></p>
            <div class="flex flex-col space-y-3">
                 <button id="login-confirm-btn" class="w-full primary-btn text-white font-semibold py-2 px-4 rounded-md">Login</button>
            </div>
        </div>
    `;
    showModal('Login to SahayMitra', modalHtml);

    document.getElementById('login-confirm-btn').addEventListener('click', () => {
        const userId = (document.getElementById('user-id') as HTMLInputElement).value.trim().toLowerCase();
        const errorEl = document.getElementById('login-error');
        
        // Find by constructing ID like "sunita101"
        const beneficiary = beneficiariesData.find(b => (b.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/gi, '') + b.id) === userId);

        if (userId === 'lender01') {
            login({ name: 'NBCFDC Lender', type: 'lender' });
        } else if (beneficiary) {
            login({ ...beneficiary, type: 'beneficiary' });
        } else {
            errorEl.textContent = 'Invalid ID. Try "sunita101" or "lender01".';
        }
    });
}

function login(user) {
    currentUser = JSON.parse(JSON.stringify(user)); // Create a deep copy for the session
    // currentUser.loan_application is already part of user if it exists
    if(!currentUser.joined_communities) currentUser.joined_communities = [];
    
    hideModal();
    loginBtn.classList.add('hidden');
    userAvatar.classList.remove('hidden');
    userAvatar.classList.add('flex');
    userNameDisplay.textContent = currentUser.name;

    if(currentUser.type === 'lender'){
        currentDashboardView = 'lender';
        window.location.hash = '#dashboard';
    } else {
        if (!currentUser.kyc_complete) {
            window.location.hash = '#ekyc';
            initKycFlow();
        } else {
            currentDashboardView = 'borrower';
            window.location.hash = '#dashboard';
        }
    }
    renderDashboard();
    handleNavigation();
}

function logout() {
    currentUser = null;
    loginBtn.classList.remove('hidden');
    userAvatar.classList.add('hidden');
    userNameDisplay.textContent = '';
    window.location.hash = '#landing';
}


// --- MODAL & TOAST ---
function showModal(title, bodyHtml, size = 'md') {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;

    modalContent.classList.remove('max-w-md', 'max-w-4xl');
    if (size === 'lg') {
        modalContent.classList.add('max-w-4xl');
    } else {
        modalContent.classList.add('max-w-md');
    }

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modalContent.classList.remove('scale-95', 'opacity-0');
}
function hideModal() {
     modalContent.classList.add('scale-95', 'opacity-0');
     setTimeout(() => modal.classList.add('opacity-0', 'pointer-events-none'), 300);
}

function showToast(message, iconClass = 'fa-check-circle', duration = 3000) {
    toastMessage.textContent = message;
    toastIcon.className = `fas ${iconClass}`;
    toast.classList.remove('opacity-0', 'translate-y-4');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
    }, duration);
}

// --- HELPERS ---
const formatCurrency = (amount) => amount.toLocaleString('en-IN');
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
function updateBeneficiaryData(updatedUser) {
    const userIndex = beneficiariesData.findIndex(b => b.id === updatedUser.id);
    if (userIndex !== -1) {
        beneficiariesData[userIndex] = JSON.parse(JSON.stringify(updatedUser)); // Deep copy back to the array
    }
}


// --- E-KYC with Facial Recognition ---
const kycStepsData = [
    { id: 1, title: 'Aadhaar' },
    { id: 2, title: 'OTP' },
    { id: 3, title: 'Facial Scan' },
    { id: 4, title: 'Done' }
];
let currentKycStep = 1;
let videoStream = null;

function renderKycStepper() {
    const stepperContainer = document.querySelector('.stepper');
    if (!stepperContainer) return;
    stepperContainer.innerHTML = kycStepsData.map((step, index) => `
        <div class="step flex-1 text-center ${step.id < currentKycStep ? 'completed' : ''} ${step.id === currentKycStep ? 'active' : ''}" id="kyc-step-${step.id}">
            <div class="step-circle w-10 h-10 mx-auto bg-surface border-2 border-light-border rounded-full flex items-center justify-center font-bold">
                ${step.id < currentKycStep ? '<i class="fas fa-check"></i>' : step.id}
            </div>
            <p class="text-sm mt-2 text-gray-400">${step.title}</p>
        </div>
        ${index < kycStepsData.length - 1 ? '<div class="step-line flex-1 h-1 bg-light-border ' + (index < currentKycStep - 1 ? 'completed' : '') + '"></div>' : ''}
    `).join('');
}

function renderKycStepContent() {
    const container = document.getElementById('kyc-content-container');
    if (!container) return;
    let contentHtml = '';
    switch(currentKycStep) {
        case 1:
            contentHtml = `
                <h3 class="font-semibold text-lg mb-4 text-center">Enter Aadhaar Number</h3>
                <input type="text" placeholder="XXXX XXXX XXXX" class="w-full text-center tracking-widest px-3 py-2 bg-gray-50 border border-light-border rounded-md shadow-sm mb-4">
                <button id="kyc-aadhaar-btn" class="w-full primary-btn text-white font-semibold py-2 px-4 rounded-md">Send OTP</button>
            `;
            break;
        case 2:
            contentHtml = `
                <h3 class="font-semibold text-lg mb-4 text-center">Enter 6-Digit OTP</h3>
                <p class="text-center text-sm text-gray-400 mb-4">Sent to your registered mobile number. (Hint: use 123456)</p>
                <input type="text" id="kyc-otp-input" placeholder="_ _ _ _ _ _" class="w-full text-center tracking-[1em] px-3 py-2 bg-gray-50 border border-light-border rounded-md shadow-sm">
                <p id="kyc-otp-error" class="text-red-500 text-sm h-5 text-center mt-2 mb-2"></p>
                <button id="kyc-otp-btn" class="w-full primary-btn text-white font-semibold py-2 px-4 rounded-md">Verify OTP</button>
            `;
            break;
        case 3:
            contentHtml = `
                <h3 class="font-semibold text-lg mb-4 text-center">Facial Verification</h3>
                <div class="relative w-full h-80 bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                    <video id="video-feed" autoplay class="w-full h-full object-cover"></video>
                    <div class="face-reticle"></div>
                    <div id="video-loader" class="absolute inset-0 bg-white/80 backdrop-blur-sm flex-col items-center justify-center hidden">
                        <i class="fas fa-spinner fa-spin text-4xl text-brand-blue"></i>
                        <p class="mt-4">Verifying...</p>
                    </div>
                </div>
                <button id="kyc-scan-face-btn" class="w-full mt-4 primary-btn text-white font-semibold py-2 px-4 rounded-md">Verify My Identity</button>
            `;
            startCamera();
            break;
        case 4:
            contentHtml = `
                <div class="text-center">
                    <i class="fas fa-check-circle text-6xl text-brand-blue mb-4"></i>
                    <h3 class="font-semibold text-lg mb-2">Verification Complete!</h3>
                    <p class="text-gray-400 mb-6">Thank you for securing your profile. Welcome to SahayMitra.</p>
                    <button id="kyc-finish-btn" class="w-full primary-btn text-white font-semibold py-2 px-4 rounded-md">Go to Dashboard</button>
                </div>
            `;
            break;
    }
    container.innerHTML = contentHtml;
    attachKycEventListeners();
}

function attachKycEventListeners() {
    document.getElementById('kyc-aadhaar-btn')?.addEventListener('click', () => { currentKycStep = 2; initKycFlow(); });
    document.getElementById('kyc-otp-btn')?.addEventListener('click', () => {
        const otpInput = document.getElementById('kyc-otp-input') as HTMLInputElement;
        if (otpInput.value === '123456') {
            currentKycStep = 3;
            initKycFlow();
        } else {
            document.getElementById('kyc-otp-error').textContent = "Invalid OTP. Use 123456.";
        }
    });
    document.getElementById('kyc-scan-face-btn')?.addEventListener('click', () => {
        document.getElementById('video-loader').classList.remove('hidden');
        document.getElementById('video-loader').classList.add('flex');
        setTimeout(() => {
            stopCamera();
            currentKycStep = 4;
            initKycFlow();
        }, 2500);
    });
    document.getElementById('kyc-finish-btn')?.addEventListener('click', () => {
        // Update the session user
        currentUser.kyc_complete = true;
        currentUser.achievements.kyc = true;
        // Update application status in the session user and pending list
        const application = pendingApplications.find(app => app.beneficiaryId === currentUser.id);
        if (application) {
            application.status = 'Pending Review';
            application.progress = 33;
        }
        if (currentUser.loan_application) {
            currentUser.loan_application.status = 'Pending Review';
            currentUser.loan_application.progress = 33;
        }
        // Persist all changes back to the main data array
        updateBeneficiaryData(currentUser);
        window.location.hash = '#dashboard';
        renderDashboard();
    });
}

async function startCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const videoEl = document.getElementById('video-feed') as HTMLVideoElement;
        videoEl.srcObject = videoStream;
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Camera access is required for facial verification. Please enable it in your browser settings.");
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
}

function initKycFlow() {
    renderKycStepper();
    renderKycStepContent();
}

// --- VOICE-ENABLED CHATBOT ---
let isMuted = false;
let isBotThinking = false;

let chatSession = { name: null, purpose: null, amount: null };

function resetChat() {
    chatSession = { name: currentUser?.name || null, purpose: null, amount: null };
    isBotThinking = false;

    if(chatWindow) {
      chatWindow.innerHTML = ''; // Clear previous messages
      chatWindow.appendChild(thinkingIndicator); // Re-add indicator
      
      let initialMessage;
      if (chatSession.name) {
          initialMessage = `Hello ${chatSession.name}! How can I help with your loan today? Please tell me the purpose and amount.`;
      } else {
          initialMessage = `Hello! I'm SahayMitra. To apply for a loan, please tell me your full name, the amount you need, and the purpose of the loan.`;
      }
      addChatMessage(initialMessage, 'assistant');
    }
}


function addThinkingIndicator() {
    thinkingIndicator.classList.remove('hidden');
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeThinkingIndicator() {
    thinkingIndicator.classList.add('hidden');
}


function addChatMessage(message, sender) {
    const bubble = document.createElement('div');
    bubble.className = `w-fit max-w-sm rounded-xl px-4 py-3 shadow-md ${sender === 'user' ? 'chat-bubble-user self-end' : 'chat-bubble-assistant self-start'}`;
    bubble.textContent = message;
    
    chatWindow.insertBefore(bubble, thinkingIndicator);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    if (sender === 'assistant' && !isMuted) {
        speak(message);
    }
}

async function handleUserMessage(message) {
    if (!message.trim() || isBotThinking) return;
    
    addChatMessage(message, 'user');
    chatInput.value = '';
    isBotThinking = true;
    addThinkingIndicator();

    const systemInstruction = `You are SahayMitra, a friendly and helpful AI loan assistant. Your goal is to collect three pieces of information to start a loan application: the user's full name, the loan purpose, and the loan amount. Use simple language. 
CRITICAL: If the user's name has been provided, you MUST use it in every response to personalize the conversation.

Current application details:
Name: ${chatSession.name || 'Not yet provided'}
Purpose: ${chatSession.purpose || 'Not yet provided'}
Amount: ${chatSession.amount || 'Not yet provided'}

Analyze the user's message:
1. Extract any new information (name, purpose, or amount). Update the session details accordingly.
2. If any information is missing, ask a simple, direct question to get ONLY the missing information.
3. Once you have all three pieces of information, you MUST ask for confirmation in a single message. Example: "Okay, ${chatSession.name || 'Guest'}. You're applying for ₹50,000 for a New Bike. Is that correct?". Use the Indian Rupee symbol (₹).
4. If the user confirms the details (e.g., says "yes", "correct"), set isApplicationComplete to true. Your responseMessage should be a simple acknowledgement like "Great! One moment while I prepare your application.".
5. If the user denies the details (e.g., says "no", "that's wrong"), set isRestart to true. Your responseMessage should be a fresh starting question like "My apologies. Let's start over. What is your full name, the loan purpose, and the amount you need?".`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `User message: "${message}"`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        responseMessage: { type: Type.STRING, description: "The text response to display to the user." },
                        extractedName: { type: Type.STRING, description: "The user's name you extracted, if any." },
                        extractedPurpose: { type: Type.STRING, description: "The loan purpose you extracted, if any." },
                        extractedAmount: { type: Type.NUMBER, description: "The loan amount you extracted as a number, if any." },
                        isApplicationComplete: { type: Type.BOOLEAN, description: "Set to true ONLY if the user has confirmed the collected details are correct." },
                        isRestart: { type: Type.BOOLEAN, description: "Set to true if the user wants to restart the process." }
                    },
                    required: ['responseMessage', 'isApplicationComplete', 'isRestart']
                },
            },
        });
        
        const result = JSON.parse(response.text);

        if (result.extractedName && !chatSession.name) chatSession.name = result.extractedName;
        if (result.extractedPurpose) chatSession.purpose = result.extractedPurpose;
        if (result.extractedAmount) chatSession.amount = result.extractedAmount;
        
        addChatMessage(result.responseMessage, 'assistant');

        if (result.isRestart) {
            chatSession = { name: chatSession.name, purpose: null, amount: null }; // Keep name if already provided
            return;
        }

        if (result.isApplicationComplete) {
            setTimeout(() => {
                if (currentUser) {
                    const newApplication = {
                        beneficiaryId: currentUser.id,
                        beneficiaryName: currentUser.name,
                        purpose: chatSession.purpose,
                        amount: chatSession.amount,
                        status: 'Pending Review',
                        progress: 33
                    };
                    currentUser.loan_application = newApplication;
                    pendingApplications.push(newApplication);
                    updateBeneficiaryData(currentUser);

                    showToast('Loan application submitted!', 'fa-file-alt');
                    addChatMessage("Your application is ready! You can track its progress on your dashboard.", 'assistant');
                } else {
                     // NEW USER FLOW
                    const newId = 100 + beneficiariesData.length + 1;
                    const newUserName = chatSession.name;
                    // Generate a login ID, e.g., "rahul104"
                    const newUserIdLogin = `${newUserName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/gi, '')}${newId}`;

                    const newUser = {
                        id: newId,
                        name: newUserName,
                        kyc_complete: false,
                        credit_score: 600, // Default starting score
                        risk_band: 'Awaiting KYC', // More accurate initial risk band
                        shap: [
                            {val: 50, desc:'Initial community trust'},
                            {val: -10, desc:'No prior repayment history'},
                            {val: 0, desc:'Awaiting utility data'}
                        ],
                        loan_details: {
                            approved_limit: 0,
                            available_limit: 0,
                            utilized_amount: 0,
                            last_payment_date: 'N/A',
                            interest_rate: '2.0%',
                            next_repayment_date: 'N/A',
                            transaction_history: []
                        },
                        achievements: { kyc: false, first_repayment: false, payment_streak: 0 },
                        impact_tokens: 0,
                    };

                    const newApplication = {
                        beneficiaryId: newUser.id,
                        beneficiaryName: newUser.name,
                        purpose: chatSession.purpose,
                        amount: chatSession.amount,
                        status: 'Pending KYC',
                        progress: 10
                    };

                    // Add the application object to the new user object so it shows on their dashboard
                    (newUser as any).loan_application = newApplication;

                    // Add the new user to our main data array
                    beneficiariesData.push(newUser);
                    // Add the application to the pending list for the lender
                    pendingApplications.push(newApplication);

                    const finalMessage = `Thank you, ${newUserName}. Your profile is created! Your new User ID is: ${newUserIdLogin}\n\nPlease log in with this ID to complete your E-KYC and submit your application for review.`;
                    addChatMessage(finalMessage, 'assistant');

                    // If a lender happens to be logged in, refresh their dashboard to show the new data instantly
                    if (currentUser && currentUser.type === 'lender') {
                        renderLenderDashboard();
                    }
                }
            }, 1500);
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        addChatMessage("I'm having a little trouble connecting right now. Please try again in a moment.", 'assistant');
    } finally {
        isBotThinking = false;
        removeThinkingIndicator();
    }
}


// Web Speech API
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition;
if(SpeechRecognition){
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        handleUserMessage(transcript);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            showToast('Microphone access denied. Please allow it in your browser settings.', 'fa-microphone-slash');
        }
    };
    
    recognition.onend = () => {
         chatVoiceBtn.classList.remove('animate-pulse', 'bg-red-500');
    }
}


function speak(text) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    speechSynthesis.speak(utterance);
}


// --- DASHBOARDS ---
function renderDashboard() {
    if (!currentUser || !dashboardContent) return;

    if (currentDashboardView === 'borrower' && currentUser.type === 'beneficiary') {
        borrowerViewBtn.classList.add('active', 'bg-surface', 'text-text-primary');
        borrowerViewBtn.classList.remove('text-text-secondary');
        lenderViewBtn.classList.remove('active', 'bg-surface', 'text-text-primary');
        lenderViewBtn.classList.add('text-text-secondary');
        renderBorrowerDashboard(currentUser);
    } else if (currentDashboardView === 'lender' && currentUser.type === 'lender') {
        lenderViewBtn.classList.add('active', 'bg-surface', 'text-text-primary');
        lenderViewBtn.classList.remove('text-text-secondary');
        borrowerViewBtn.classList.remove('active', 'bg-surface', 'text-text-primary');
        borrowerViewBtn.classList.add('text-text-secondary');
        renderLenderDashboard();
    }
}

function renderBorrowerDashboard(user) {
    const { loan_details: details, achievements, impact_tokens, loan_application, shap } = user;

    let activeLoanHtml;
    if (loan_application) {
        activeLoanHtml = `
            <h2 class="text-xl font-semibold mb-4 text-text-primary">My Active Loan</h2>
            <p class="text-sm text-text-secondary font-medium">${loan_application.purpose} - <span class="font-bold">${loan_application.status}</span></p>
            <div class="w-full bg-gray-200 rounded-full h-2.5 my-3">
                <div class="bg-brand-blue h-2.5 rounded-full" style="width: ${loan_application.progress}%"></div>
            </div>
            <p class="text-sm text-text-secondary">${loan_application.progress}% complete</p>
            <p class="mt-4 text-sm text-gray-600">You can track your application progress here. We will notify you of any updates.</p>
        `;
    } else {
        activeLoanHtml = `
            <h2 class="text-xl font-semibold mb-4 text-text-primary">My Active Loan</h2>
            <p class="text-sm text-text-secondary">You have no active loan applications.</p>
            <a href="#apply-loan" class="nav-link inline-block mt-4 primary-btn text-white font-semibold py-2 px-4 rounded-md">Apply Now</a>
        `;
    }

    const shapHtml = shap.map(s => `
        <li class="flex justify-between items-center text-xs p-2 rounded-md ${s.val > 0 ? 'bg-green-50' : 'bg-red-50'}">
            <span class="text-text-secondary">${s.desc}</span>
            <span class="font-bold ${s.val > 0 ? 'text-green-700' : 'text-red-700'}">${s.val > 0 ? '+' : ''}${s.val} pts</span>
        </li>
    `).join('');

    const dashboardHtml = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left & Center Column -->
            <div class="lg:col-span-2 space-y-6">
                 <!-- Active Loan & Credit Score -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="solid-card p-6 rounded-xl">
                        ${activeLoanHtml}
                    </div>
                    <div class="solid-card p-6 rounded-xl">
                        <div class="flex justify-between items-start mb-3">
                             <div>
                                <h2 class="text-xl font-semibold text-text-primary">Your Credit Score</h2>
                                <p class="text-brand-blue font-medium text-sm">${user.risk_band}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-5xl font-bold text-brand-blue">${user.credit_score}</p>
                                <p class="text-sm text-text-secondary">Excellent</p>
                            </div>
                        </div>
                        <h4 class="text-sm font-semibold text-text-primary mb-2">What makes up your score:</h4>
                        <ul class="space-y-1.5">${shapHtml}</ul>
                    </div>
                </div>
                 <!-- Living Loan Management -->
                <div class="solid-card p-6 rounded-xl">
                    <h2 class="text-xl font-semibold mb-4 text-text-primary">"Living Loan" Management</h2>
                     <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
                        <div><p class="text-sm text-text-secondary">Utilized</p><p class="font-bold text-lg text-text-primary">₹${formatCurrency(details.utilized_amount)}</p></div>
                        <div><p class="text-sm text-text-secondary">Interest Rate</p><p class="font-bold text-lg text-text-primary">${details.interest_rate}<span class="text-xs font-normal">/month</span></p></div>
                        <div><p class="text-sm text-text-secondary">Last Payment</p><p class="font-bold text-lg text-text-primary">${details.last_payment_date}</p></div>
                         <div><p class="text-sm text-text-secondary">Status</p><p class="font-bold text-lg text-green-600">Active</p></div>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-4 mb-4">
                        <button id="make-repayment-btn" class="flex-1 primary-btn text-white font-semibold py-3 px-4 rounded-md">Make Repayment</button>
                        <button id="view-statement-btn" class="flex-1 bg-gray-200 text-text-primary font-semibold py-3 px-4 rounded-md hover:bg-gray-300 transition">View Statement</button>
                     </div>
                     <div class="flex flex-col sm:flex-row gap-4 border-t border-light-border pt-4">
                        <button id="simulate-growth-btn" class="flex-1 bg-green-100 text-green-700 font-semibold py-3 px-4 rounded-md hover:bg-green-200 transition">Simulate Business Growth</button>
                        <button id="simulate-decline-btn" class="flex-1 bg-red-100 text-red-700 font-semibold py-3 px-4 rounded-md hover:bg-red-200 transition">Simulate Business Decline</button>
                     </div>
                </div>
            </div>
            <!-- Right Column -->
            <div class="space-y-6">
                <!-- Social Impact Rewards -->
                <div class="solid-card p-6 rounded-xl">
                    <h2 class="text-xl font-semibold mb-4 flex items-center gap-2 text-text-primary"><i class="fas fa-star text-brand-amber"></i>Social Impact Rewards</h2>
                    <p class="text-sm text-text-secondary mb-4">Earn tokens for timely payments and community work.</p>
                    <div class="bg-gray-50 p-4 rounded-lg text-center">
                        <p class="text-gray-500">Your Balance</p>
                        <p class="text-4xl font-bold text-brand-amber">${impact_tokens}</p>
                        <p class="text-sm text-text-secondary">Impact Tokens</p>
                    </div>
                     <h3 class="font-semibold mt-6 mb-3 text-text-primary">Redeem Your Tokens</h3>
                     <div class="space-y-3">
                        <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <div>
                                <p class="font-medium text-text-primary"><i class="fas fa-gift text-brand-blue mr-2"></i>Local Goods Voucher</p>
                                <p class="text-xs text-text-secondary">50 tokens</p>
                            </div>
                            <button id="redeem-voucher-btn" class="bg-brand-blue/10 text-brand-blue text-xs font-bold px-4 py-1 rounded-full hover:bg-brand-blue/20">Redeem</button>
                        </div>
                     </div>
                </div>
                 <!-- Achievements -->
                 <div class="solid-card p-6 rounded-xl">
                    <h2 class="text-xl font-semibold mb-4 flex items-center gap-2 text-text-primary"><i class="fas fa-trophy text-brand-amber"></i>Your Achievements</h2>
                    <div id="beneficiary-achievements" class="space-y-4"></div>
                </div>
            </div>
        </div>
    `;
    dashboardContent.innerHTML = dashboardHtml;
    renderBorrowerAchievements(user, 'beneficiary-achievements');
    attachBorrowerDashboardListeners(user);
}

function attachBorrowerDashboardListeners(user) {
    document.getElementById('make-repayment-btn').addEventListener('click', () => showRepaymentModal(user));
    document.getElementById('view-statement-btn').addEventListener('click', () => showStatementModal(user));
    document.getElementById('redeem-voucher-btn').addEventListener('click', () => {
        showToast('Voucher Redeemed! Check your messages.', 'fa-gift');
    });
    document.getElementById('simulate-growth-btn').addEventListener('click', () => {
        const increase = 5000;
        if(user.loan_details.utilized_amount + increase <= user.loan_details.approved_limit){
            user.loan_details.utilized_amount += increase;
            renderBorrowerDashboard(user);
            showToast(`Simulated growth: Utilized amount increased by ₹${formatCurrency(increase)}`, 'fa-arrow-up');
        } else {
             showToast('Cannot utilize beyond approved limit.', 'fa-exclamation-circle');
        }
    });
    document.getElementById('simulate-decline-btn').addEventListener('click', () => {
         showToast('We are here to support you. Contact us for help.', 'fa-hands-helping');
    });
}


function renderBorrowerAchievements(user, containerId) {
    const achievementTemplates = {
        kyc: { title: 'Verified Member', description: 'You completed your E-KYC!', icon: 'fa-check-circle' },
        first_repayment: { title: 'First Step', description: 'You made your first repayment!', icon: 'fa-flag-checkered' },
        payment_streak: { title: 'Consistent Star', description: '3 on-time payments in a row!', icon: 'fa-award' }
    };

    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = Object.entries(achievementTemplates).map(([key, ach]) => {
        const isUnlocked = user.achievements[key] === true || (key === 'payment_streak' && user.achievements[key] >= 3);
        return `
            <div class="flex items-start gap-4 p-3 rounded-lg ${isUnlocked ? 'bg-gray-50' : 'bg-gray-50 opacity-60'}">
                <div class="w-10 h-10 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-blue-100' : 'bg-gray-200'}">
                    <i class="fas ${isUnlocked ? ach.icon + ' text-brand-blue' : 'fa-lock text-gray-400'} text-lg"></i>
                </div>
                <div>
                    <h4 class="font-semibold text-text-primary">${ach.title}</h4>
                    <p class="text-sm text-text-secondary">${ach.description}</p>
                </div>
            </div>
        `;
    }).join('');
}

function showRepaymentModal(user) {
     const modalHtml = `
        <div id="repayment-form">
            <p class="text-sm text-text-secondary mb-2">Outstanding Amount: <span class="font-bold text-lg text-red-500">₹${formatCurrency(user.loan_details.utilized_amount)}</span></p>
            <div>
                <label for="repayment-amount" class="block text-sm font-medium text-gray-500">Amount to Pay (₹)</label>
                <input type="number" id="repayment-amount" class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-light-border rounded-md text-text-primary" placeholder="e.g., 500">
            </div>
            <p id="repayment-error" class="text-red-500 text-sm h-5 mt-2"></p>
            <button id="confirm-payment-btn" class="w-full mt-4 primary-btn text-white font-semibold py-2 px-4 rounded-md">Pay Now</button>
        </div>`;
    showModal('Make a Repayment', modalHtml);

    document.getElementById('confirm-payment-btn').onclick = () => {
        const amountInput = document.getElementById('repayment-amount') as HTMLInputElement;
        const amountValue = amountInput.value;
        const amount = parseFloat(amountValue);
        const errorEl = document.getElementById('repayment-error');

        if (!amountValue || isNaN(amount) || amount <= 0) {
            errorEl.textContent = 'Please enter a valid positive amount.';
            return;
        }
        if (amount > user.loan_details.utilized_amount) {
            errorEl.textContent = `Amount cannot exceed outstanding balance.`;
            return;
        }
        
        errorEl.textContent = ''; // Clear error on success
        user.loan_details.utilized_amount -= amount;
        user.impact_tokens += Math.floor(amount / 100); 

        // Add to transaction history
        user.loan_details.transaction_history.push({
            date: new Date().toISOString().split('T')[0],
            desc: 'Repayment',
            debit: 0,
            credit: amount,
            balance: user.loan_details.utilized_amount
        });
        user.loan_details.last_payment_date = new Date().toISOString().split('T')[0];
        
        // Persist changes
        updateBeneficiaryData(user);
        
        hideModal();
        showToast(`Payment of ₹${formatCurrency(amount)} successful!`, 'fa-check-circle');

        if (!user.achievements.first_repayment) {
            user.achievements.first_repayment = true;
            setTimeout(() => showToast('Achievement Unlocked: First Step!', 'fa-trophy'), 3100);
        }

        renderBorrowerDashboard(user);
    };
}

function showStatementModal(user) {
    const history = user.loan_details.transaction_history;
    let tableHtml;
    if (history.length === 0) {
        tableHtml = `<p class="text-center text-text-secondary">No transactions have been made yet.</p>`;
    } else {
        tableHtml = `
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-light-border">
                        <th class="py-2 text-left font-semibold text-text-secondary">Date</th>
                        <th class="py-2 text-left font-semibold text-text-secondary">Description</th>
                        <th class="py-2 text-right font-semibold text-text-secondary">Credit (₹)</th>
                        <th class="py-2 text-right font-semibold text-text-secondary">Balance (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map(tx => `
                        <tr class="border-b border-light-border">
                            <td class="py-3">${formatDate(tx.date)}</td>
                            <td>${tx.desc}</td>
                            <td class="text-right text-green-600 font-medium">${tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                            <td class="text-right font-semibold">${formatCurrency(tx.balance)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    showModal('Transaction Statement', tableHtml);
}


function renderLenderDashboard() {
    const newApplicationsHtml = pendingApplications.length > 0 ? pendingApplications.map(app => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
                <p class="font-semibold text-text-primary">${app.beneficiaryName}</p>
                <p class="text-sm text-text-secondary">${app.purpose} - <span class="font-bold">₹${formatCurrency(app.amount)}</span></p>
            </div>
            <button data-beneficiary-id="${app.beneficiaryId}" class="review-application-btn text-brand-blue hover:underline text-sm font-semibold">Review <i class="fas fa-arrow-right ml-1"></i></button>
        </div>
    `).join('') : '<p class="text-sm text-center text-text-secondary p-4">No new applications at this time.</p>';

    const dashboardHtml = `
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="solid-card p-5 rounded-xl flex items-center gap-4"><div class="bg-blue-100 p-3 rounded-full"><i class="fas fa-users text-xl text-blue-500"></i></div><div><p class="text-sm text-text-secondary">Total Beneficiaries</p><p id="total-beneficiaries" class="text-2xl font-bold text-text-primary"></p></div></div>
            <div class="solid-card p-5 rounded-xl flex items-center gap-4"><div class="bg-green-100 p-3 rounded-full"><i class="fas fa-money-bill-wave text-xl text-green-500"></i></div><div><p class="text-sm text-text-secondary">Total Utilized Amount</p><p id="total-utilized" class="text-2xl font-bold text-text-primary"></p></div></div>
            <div class="solid-card p-5 rounded-xl flex items-center gap-4"><div class="bg-amber-100 p-3 rounded-full"><i class="fas fa-tachometer-alt text-xl text-amber-500"></i></div><div><p class="text-sm text-text-secondary">Average Credit Score</p><p id="avg-score" class="text-2xl font-bold text-text-primary"></p></div></div>
        </div>
        <!-- Main Content -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div class="lg:col-span-2 space-y-6">
                 <div class="solid-card p-6 rounded-xl">
                    <h2 class="text-xl font-semibold mb-4 text-text-primary">New Loan Applications</h2>
                    <div id="new-applications-list" class="space-y-3">${newApplicationsHtml}</div>
                </div>
                <div class="solid-card p-6 rounded-xl">
                     <h2 class="text-xl font-semibold mb-4 text-text-primary">Beneficiary Portfolio</h2>
                     <table class="w-full">
                        <thead><tr class="border-b border-light-border"><th class="py-2 text-left text-xs font-semibold uppercase text-text-secondary">Beneficiary</th><th class="py-2 text-left text-xs font-semibold uppercase text-text-secondary">Credit Score</th><th class="py-2 text-left text-xs font-semibold uppercase text-text-secondary">Risk Band</th><th class="py-2 text-left text-xs font-semibold uppercase text-text-secondary">Utilized Amount</th><th class="py-2 text-left text-xs font-semibold uppercase text-text-secondary">Action</th></tr></thead>
                        <tbody id="beneficiaries-table-body"></tbody>
                     </table>
                </div>
            </div>
            <div class="space-y-6">
                <div class="solid-card p-6 rounded-xl">
                    <h2 class="text-xl font-semibold mb-4 text-text-primary">Portfolio Risk Distribution</h2>
                    <div id="risk-distribution-chart" class="w-full space-y-3"></div>
                </div>
                <div class="solid-card p-6 rounded-xl"><h2 class="text-xl font-semibold mb-4 text-text-primary">Portfolio Milestones</h2><div id="lender-achievements" class="space-y-4"></div></div>
            </div>
        </div>
    `;
    dashboardContent.innerHTML = dashboardHtml;
    
    // KPIs
    const totalBeneficiaries = beneficiariesData.length;
    const totalUtilized = beneficiariesData.reduce((sum, b) => sum + b.loan_details.utilized_amount, 0);
    const avgScore = Math.round(beneficiariesData.reduce((sum, b) => sum + b.credit_score, 0) / totalBeneficiaries);

    document.getElementById('total-beneficiaries').textContent = totalBeneficiaries.toString();
    document.getElementById('total-utilized').textContent = `₹${formatCurrency(totalUtilized)}`;
    document.getElementById('avg-score').textContent = avgScore.toString();

    // Table
    const tableBody = document.getElementById('beneficiaries-table-body');
    tableBody.innerHTML = beneficiariesData.map(b => `
        <tr class="border-b border-light-border">
            <td class="py-3 text-text-primary font-medium">${b.name}</td>
            <td class="py-3 font-semibold text-brand-blue">${b.credit_score}</td>
            <td class="py-3 text-text-secondary">${b.risk_band}</td>
            <td class="py-3 text-text-secondary">₹${formatCurrency(b.loan_details.utilized_amount)}</td>
            <td class="py-3"><button data-beneficiary-id="${b.id}" class="view-profile-btn text-brand-blue hover:underline text-sm font-semibold">View Profile <i class="fas fa-arrow-right ml-1"></i></button></td>
        </tr>
    `).join('');
    
    attachLenderDashboardListeners();
    renderRiskDistributionChart();
    renderLenderAchievements(totalBeneficiaries, totalUtilized);
}

function attachLenderDashboardListeners() {
     // Use event delegation for dynamically created buttons
    dashboardContent.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const viewProfileBtn = target.closest('.view-profile-btn');
        const reviewAppBtn = target.closest('.review-application-btn');

        let beneficiaryId;
        if (viewProfileBtn) {
            // FIX: Cast Element to HTMLElement to access dataset property.
            beneficiaryId = parseInt((viewProfileBtn as HTMLElement).dataset.beneficiaryId, 10);
        } else if (reviewAppBtn) {
            // FIX: Cast Element to HTMLElement to access dataset property.
            beneficiaryId = parseInt((reviewAppBtn as HTMLElement).dataset.beneficiaryId, 10);
        }

        if (beneficiaryId) {
            const beneficiary = beneficiariesData.find(b => b.id === beneficiaryId);
            if (beneficiary) {
                showBeneficiaryProfileModal(beneficiary);
            }
        }
    });
}

function renderRiskDistributionChart() {
    const chartContainer = document.getElementById('risk-distribution-chart');
    if (!chartContainer) return;

    const riskCounts = beneficiariesData.reduce((acc, b) => { acc[b.risk_band] = (acc[b.risk_band] || 0) + 1; return acc; }, {});
    const total = beneficiariesData.length;
    const RISK_COLORS = { 'Low Risk-High Need': 'bg-blue-500', 'Low Risk-Low Need': 'bg-blue-300', 'High Risk-High Need': 'bg-amber-400', 'High Risk-Low Need': 'bg-red-400', 'Awaiting KYC': 'bg-gray-400' };

    chartContainer.innerHTML = Object.entries(riskCounts).map(([name, value]) => {
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        return `
            <div>
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-medium text-text-secondary">${name}</span>
                    <span class="text-xs font-bold text-text-primary">${percentage}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="${RISK_COLORS[name] || 'bg-gray-400'} h-2 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function showBeneficiaryProfileModal(beneficiary) {
    const getRiskBandColor = (riskBand) => {
        if (riskBand.includes('Low Risk')) return 'text-green-600 bg-green-100';
        if (riskBand.includes('High Risk')) return 'text-amber-600 bg-amber-100';
        return 'text-gray-600 bg-gray-100';
    };

    const shapHtml = beneficiary.shap.map(s => `
        <li class="flex justify-between items-center p-3 rounded-lg ${s.val > 0 ? 'bg-green-50' : 'bg-red-50'}">
            <span class="text-sm">${s.desc}</span>
            <span class="font-bold ${s.val > 0 ? 'text-green-700' : 'text-red-700'}">${s.val > 0 ? '+' : ''}${s.val}</span>
        </li>
    `).join('');

    let actionPanelHtml = '';
    const application = pendingApplications.find(app => app.beneficiaryId === beneficiary.id);

    if (application) {
         actionPanelHtml = `
            <h4 class="text-lg font-semibold text-text-primary mb-3">Application Review</h4>
            <p class="text-sm text-text-secondary mb-4">${beneficiary.name} has applied for a loan of <span class="font-bold">₹${formatCurrency(application.amount)}</span> for the purpose of "${application.purpose}".</p>
            <div class="space-y-3">
                <button data-action="approve" data-amount="${application.amount}" class="action-btn w-full primary-btn font-semibold py-2.5 px-4 rounded-md"><i class="fas fa-check mr-2"></i>Approve Loan</button>
                <button data-action="reject" class="action-btn w-full bg-red-500 text-white font-semibold py-2.5 px-4 rounded-md">Reject Application</button>
            </div>
        `;
    } else {
         actionPanelHtml = `
            <h4 class="text-lg font-semibold text-text-primary mb-3">Actions</h4>
            <p class="text-sm text-text-secondary mb-4">No pending actions for this beneficiary.</p>
        `;
    }
    
    const history = beneficiary.loan_details.transaction_history;
    let historyHtml;
    if (history.length === 0) {
        historyHtml = `<p class="text-sm text-text-secondary text-center p-4">No recent transactions found.</p>`;
    } else {
        historyHtml = `
             <table class="w-full text-sm">
                <thead><tr class="border-b"><th class="py-1 text-left font-semibold">Date</th><th class="py-1 text-left font-semibold">Description</th><th class="py-1 text-right font-semibold">Amount</th></tr></thead>
                <tbody>
                ${history.slice(-3).reverse().map(tx => `
                    <tr class="border-b">
                        <td class="py-2">${formatDate(tx.date)}</td>
                        <td>${tx.desc}</td>
                        <td class="text-right font-medium ${tx.credit > 0 ? 'text-green-600' : 'text-red-600'}">₹${formatCurrency(tx.credit > 0 ? tx.credit : tx.debit)}</td>
                    </tr>
                `).join('')}
                </tbody>
            </table>
        `;
    }


    const modalHtml = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Beneficiary Header -->
                <div>
                    <div class="flex justify-between items-center">
                        <h3 class="text-2xl font-bold text-text-primary">${beneficiary.name}</h3>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${getRiskBandColor(beneficiary.risk_band)}">${beneficiary.risk_band}</span>
                    </div>
                    <p class="text-sm text-text-secondary">Beneficiary ID: ${beneficiary.id}</p>
                </div>

                <!-- Explainable AI (XAI) Section -->
                <div class="solid-card p-5 rounded-xl border border-light-border">
                    <h4 class="text-lg font-semibold text-text-primary mb-1">Composite Credit Score: <span class="text-brand-blue">${beneficiary.credit_score}</span></h4>
                    <p class="text-sm text-text-secondary mb-4">This score combines repayment history with income-proxy data for a fair assessment.</p>
                    <ul class="space-y-2">
                        <li class="flex justify-between items-center p-3 rounded-lg bg-gray-100">
                            <span class="text-sm font-semibold">Base Score</span>
                            <span class="font-bold text-gray-800">600</span>
                        </li>
                        ${shapHtml}
                    </ul>
                </div>

                <!-- Transaction History -->
                <div class="solid-card p-5 rounded-xl border border-light-border">
                    <h4 class="text-lg font-semibold text-text-primary mb-3">Recent Transaction History</h4>
                    ${historyHtml}
                </div>
            </div>

            <!-- Right Column -->
            <div class="space-y-6">
                <!-- Action Panel -->
                <div class="solid-card p-5 rounded-xl border-2 border-brand-blue">
                    ${actionPanelHtml}
                </div>

                <!-- Achievements -->
                <div class="solid-card p-5 rounded-xl border border-light-border">
                    <h4 class="text-lg font-semibold text-text-primary mb-3">Achievements</h4>
                    <div id="modal-beneficiary-achievements"></div>
                </div>
            </div>
        </div>
    `;
    showModal(`Beneficiary Profile`, modalHtml, 'lg');
    renderBorrowerAchievements(beneficiary, 'modal-beneficiary-achievements');

    // Attach listener for action buttons inside the modal
    document.querySelector('#modal-body').addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const actionBtn = target.closest('.action-btn');
        if (actionBtn) {
            // FIX: Cast Element to HTMLElement to access dataset property.
            const action = (actionBtn as HTMLElement).dataset.action;
            // FIX: Cast Element to HTMLElement to access dataset property.
            const amount = parseFloat((actionBtn as HTMLElement).dataset.amount);
            processApplication(beneficiary.id, action, amount);
        }
    });
}

function processApplication(beneficiaryId, status, amount) {
    const appIndex = pendingApplications.findIndex(app => app.beneficiaryId === beneficiaryId);
    if (appIndex === -1) return;

    const beneficiary = beneficiariesData.find(b => b.id === beneficiaryId);
    if (!beneficiary) return;

    if (status === 'approve') {
        beneficiary.loan_details.utilized_amount += amount;
        beneficiary.loan_details.available_limit -= amount;
        beneficiary.loan_details.transaction_history.push({
             date: new Date().toISOString().split('T')[0],
             desc: 'Loan Disbursed',
             // FIX: A loan disbursement increases the utilized amount, so it should be logged as a debit, not a credit.
             credit: 0,
             debit: amount,
             balance: beneficiary.loan_details.utilized_amount
        });
        showToast(`Loan for ${beneficiary.name} approved!`, 'fa-check-circle');
    } else if (status === 'reject') {
        showToast(`Loan for ${beneficiary.name} has been rejected.`, 'fa-times-circle');
    }
    
    // Update beneficiary's application status on their object
    const beneficiaryInCurrentUserSession = beneficiariesData.find(b => b.id === currentUser?.id);
    if (beneficiaryInCurrentUserSession && beneficiaryInCurrentUserSession.id === beneficiaryId) {
        // FIX: Cast to any to dynamically add property not in original type.
        (beneficiaryInCurrentUserSession as any).loan_application = null;
    }
    // FIX: Cast to any to dynamically add property not in original type.
    (beneficiary as any).loan_application = null;

    pendingApplications.splice(appIndex, 1);
    
    hideModal();
    renderLenderDashboard();
}


function renderLenderAchievements(totalBeneficiaries, totalUtilized) {
     const achievements = [
        { title: 'Emerging Partner', desc: 'Fund 5+ beneficiaries', current: totalBeneficiaries, goal: 5, icon: 'fa-star' },
        { title: 'Capital Champion', desc: 'Disburse over ₹1,00,000', current: totalUtilized, goal: 100000, icon: 'fa-hand-holding-usd' },
        { title: 'Community Pillar', desc: 'Fund 10+ beneficiaries', current: totalBeneficiaries, goal: 10, icon: 'fa-building' },
     ];
     const container = document.getElementById('lender-achievements');
     if (!container) return;
     container.innerHTML = achievements.map(ach => {
        const progress = Math.min((ach.current / ach.goal) * 100, 100);
        const isUnlocked = progress >= 100;
        return `
            <div class="${isUnlocked ? '' : 'opacity-70'}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-amber-100' : 'bg-gray-200'}">
                         <i class="fas ${ach.icon} ${isUnlocked ? 'text-brand-amber' : 'text-gray-400'}"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-text-primary">${ach.title}</h4>
                        <p class="text-xs text-text-secondary">${ach.desc}</p>
                    </div>
                </div>
                 <div class="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div class="bg-brand-blue h-1.5 rounded-full" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
     }).join('');
}


// --- AI SCANNER ---
function setupAiScannerListeners() {
    chooseImageBtn.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result as string;
                imagePreview.classList.remove('hidden');
                imagePlaceholder.classList.add('hidden');
                scanRecordBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    });

    scanRecordBtn.addEventListener('click', () => {
        scannerLoader.classList.remove('hidden');
        scannerLoader.classList.add('flex');
        scannerOutput.textContent = '';

        setTimeout(() => {
            const mockCSV = `id,name,loan_amount,due_date,status\n201,Rajesh Singh,15000,2024-08-10,PAID\n202,Meena Kumari,25000,2024-08-12,DUE\n203,Anil Yadav,10000,2024-08-15,PAID\n204,Sita Bai,30000,2024-08-20,DUE`;
            scannerOutput.textContent = mockCSV;
            scannerLoader.classList.add('hidden');
        }, 2500);
    });
}

// --- COMMUNITIES ---
function renderCommunities() {
    const grid = document.getElementById('communities-grid');
    if (!grid) return;
    grid.innerHTML = communitiesData.map(c => `
        <div class="solid-card p-6 rounded-xl flex flex-col">
            <div class="flex-grow">
                <h3 class="text-xl font-bold text-text-primary">${c.name}</h3>
                <p class="text-text-secondary text-sm mt-1"><i class="fas fa-map-marker-alt mr-2"></i>${c.location}</p>
                <div class="my-4 space-y-2">
                    <div class="flex justify-between text-sm"><span class="text-text-secondary"><i class="fas fa-bullseye text-brand-blue mr-2"></i>Loan Purpose</span><span class="font-semibold text-text-primary">${c.purpose}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-text-secondary"><i class="fas fa-shield-alt text-brand-blue mr-2"></i>Trust Score</span><span class="font-semibold text-text-primary">${c.trustScore}/100</span></div>
                </div>
            </div>
            <button data-community-name="${c.name}" class="join-community-btn w-full mt-4 primary-btn text-white font-semibold py-2 px-4 rounded-md">Join Community</button>
        </div>
    `).join('');
    attachCommunityEventListeners();
    updateJoinedCommunityButtons();
}

function attachCommunityEventListeners() {
    document.querySelectorAll('.join-community-btn').forEach(button => {
        button.replaceWith(button.cloneNode(true));
    });
    document.querySelectorAll('.join-community-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            const communityName = btn.dataset.communityName;
            
            if (!currentUser) {
                showLoginModal();
                return;
            }

            if (currentUser.joined_communities?.includes(communityName)) return;

            currentUser.joined_communities.push(communityName);
            updateBeneficiaryData(currentUser); // Persist joined community
            showToast(`Welcome! You've joined ${communityName}`, 'fa-users');
            updateJoinedCommunityButtons();
        });
    });
}

function updateJoinedCommunityButtons() {
    if (!currentUser || !currentUser.joined_communities) return;
    document.querySelectorAll('.join-community-btn').forEach(button => {
        const btn = button as HTMLButtonElement;
        const communityName = btn.dataset.communityName;
        if (currentUser.joined_communities.includes(communityName)) {
            btn.innerHTML = '<i class="fas fa-check mr-2"></i> Joined';
            btn.disabled = true;
            btn.classList.remove('primary-btn');
            btn.classList.add('bg-green-600');
        }
    });
}

// --- APP INITIALIZATION ---
function initApp() {
    // Initial page load
    handleNavigation();
    
    // Setup global event listeners
    window.addEventListener('hashchange', handleNavigation);
    modalCloseBtn.addEventListener('click', hideModal);
    loginBtn.addEventListener('click', showLoginModal);
    logoutBtn.addEventListener('click', logout);
    
    // Use event delegation for all navigation links to handle dynamically added content
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const navLink = target.closest('.nav-link');
        if (navLink) {
            const href = navLink.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                window.location.hash = href;
            }
        }
    });

    // Chatbot listeners
    chatSendBtn.addEventListener('click', () => handleUserMessage(chatInput.value));
    chatInput.addEventListener('keyup', (e) => e.key === 'Enter' && handleUserMessage(chatInput.value));
    chatVoiceBtn.addEventListener('click', () => {
        if(recognition) {
            chatVoiceBtn.classList.add('animate-pulse', 'bg-red-500');
            recognition.start();
        }
    });
    chatMuteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        chatMuteBtn.innerHTML = `<i class="fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}"></i>`;
        showToast(isMuted ? 'Audio muted' : 'Audio unmuted', isMuted ? 'fa-volume-mute' : 'fa-volume-up', 1500);
    });

    // Dashboard toggle
    borrowerViewBtn.addEventListener('click', () => {
        if (currentUser?.type === 'beneficiary') {
            currentDashboardView = 'borrower';
            renderDashboard();
        } else {
            showToast('Please log in as a beneficiary.', 'fa-user-circle');
            showLoginModal();
        }
    });
    lenderViewBtn.addEventListener('click', () => {
        if (currentUser?.type === 'lender') {
            currentDashboardView = 'lender';
            renderDashboard();
        } else {
            showToast('Please log in as a lender.', 'fa-briefcase');
            showLoginModal();
        }
    });

    // Render static content
    setupAiScannerListeners();
    renderCommunities();
}

// Wait for the DOM to be fully loaded before initializing the app
document.addEventListener('DOMContentLoaded', initApp);