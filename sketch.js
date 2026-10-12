let currentPage = 'home';
let pageHistory = ['home'];

function setup() {
  // Hidden 1x1 dummy canvas to satisfy p5 setup lifecycle
  let canvas = createCanvas(1, 1);
  canvas.parent('canvas-container');

  // Initialize Page 1 (Captcha Matrix)
  if (typeof initCaptchaPage === 'function') {
    initCaptchaPage();
  }

  // Initialize Page 2 (Waves)
  if (typeof setupPage2 === 'function') {
    setupPage2();
  }

  // Initialize Page 3-5
  if (typeof setupPage3 === 'function') {
    setupPage3();
  }
  if (typeof setupPage4 === 'function') {
    setupPage4();
  }
  if (typeof setupPage5 === 'function') {
    setupPage5();
  }

  updateUI();
}

function draw() {
  if (currentPage === 'page2' && typeof drawPage2 === 'function') {
    drawPage2();
  } else if (currentPage === 'page3' && typeof drawPage3 === 'function') {
    drawPage3();
  } else if (currentPage === 'page4' && typeof drawPage4 === 'function') {
    drawPage4();
  } else if (currentPage === 'page5' && typeof drawPage5 === 'function') {
    drawPage5();
  }
}

function goTo(pageName) {
  if (currentPage !== pageName) {
    currentPage = pageName;
    pageHistory.push(pageName);
    updateUI();
  }
}

function goBack() {
  if (pageHistory.length > 1) {
    pageHistory.pop();
    currentPage = pageHistory[pageHistory.length - 1];
    updateUI();
  }
}

function reloadCurrentPage() {
  if (currentPage === 'page1' && typeof refreshAllCaptchas === 'function') {
    refreshAllCaptchas();
  } else if (currentPage === 'page2' && typeof setupPage2 === 'function') {
    setupPage2();
  } else if (currentPage === 'page3' && typeof setupPage3 === 'function') {
    setupPage3();
  } else if (currentPage === 'page4' && typeof setupPage4 === 'function') {
    setupPage4();
  } else if (currentPage === 'page5' && typeof setupPage5 === 'function') {
    setupPage5();
  }
}

function updateUI() {
  // Address Bar
  document.getElementById('address-bar').innerText = 'https://my-browser.local/' + currentPage;

  // Active Tab Highlight
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  let activeTab = document.getElementById('tab-' + currentPage);
  if (activeTab) activeTab.classList.add('active');

  // Back Button State
  let backBtn = document.getElementById('btn-back');
  if (pageHistory.length > 1) {
    backBtn.removeAttribute('disabled');
  } else {
    backBtn.setAttribute('disabled', 'true');
  }

  // View Routing
  const homeView = document.getElementById('home-view');
  const captchaView = document.getElementById('captcha-view');
  const canvasContainer = document.getElementById('canvas-container');

  homeView.style.display = 'none';
  captchaView.style.display = 'none';
  canvasContainer.style.display = 'none';

  if (currentPage === 'home') {
    homeView.style.display = 'block';
    noLoop();
  } else if (currentPage === 'page1') {
    captchaView.style.display = 'block';
    noLoop();
  } else if (currentPage === 'page2' || currentPage === 'page3' || currentPage === 'page4' || currentPage === 'page5') {
    canvasContainer.style.display = 'block';
    loop();
  }
}
