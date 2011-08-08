/**
 * Hangout injection to change the DOM.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
hangout.injection.HangoutInjection = function() {
  this.LAZY_LOAD_MS = 10000;
  this.FIRST_LOAD_MS = 2000;
  this.SETTINGS_CLASS_ID = 'hangout-settings';
  this.CHAT_CLASS_ID = 'hangout-chat';
  this.YOUTUBE_CLASS_ID = 'hangout-youtube';
  this.TOOLBAR_CHECKED_CLASS_ID = 'hangout-toolbar-button-checked';
  this.VIDEO_ID = 'gcmvwi';
  this.videoDisplay = '';
  this.gameDisplay = null;
  this.gameFrame = null;
  this.youtubeNode = null;
  this.chatNode = null;
  this.gameNode = null;
  this.settingsNode = null;
  this.firstLoads = true;
};

/**
 * Initialization routine that spawns the DOM injection after 10 seconds since the Hangout DOM
 * is asynchronous.
 */
hangout.injection.HangoutInjection.prototype.init = function() {
  this.onGetCurrentTab();
  setTimeout(this.domInject.bind(this), this.LAZY_LOAD_MS);
};

/**
 * When tab is created, it will fire this current tab.
 * @param {Object} tab The current tab that the browser action is referring to.
 */
hangout.injection.HangoutInjection.prototype.onGetCurrentTab = function() {
  chrome.extension.sendRequest({ method: 'HangoutTabCreated' });
};

/**
 * Injects the Games Icon DOM to the view.
 */
hangout.injection.HangoutInjection.prototype.domInject = function() {
  this.youtubeNode = document.querySelector('.' + this.YOUTUBE_CLASS_ID);
  this.chatNode = document.querySelector('.' + this.CHAT_CLASS_ID);
  this.settingsNode = document.querySelector('.' + this.SETTINGS_CLASS_ID);
  if (this.youtubeNode) {
    this.renderGameButton();
    this.renderGameCanvas();
    this.setupAwkwardButtonListeners();
  }
};

/**
 * This is really awkward, don't do this at home.
 */
hangout.injection.HangoutInjection.prototype.setupAwkwardButtonListeners = function() {
  this.youtubeNode.addEventListener('click', this.doLayout.bind(this), false);
  this.chatNode.addEventListener('click', this.doLayout.bind(this), false);
  this.settingsNode.addEventListener('click', this.doLayout.bind(this), false);
  window.addEventListener('resize', this.doLayout.bind(this), false);
};

/**
 * Redo the entire layout since Google is being mean.
 */
hangout.injection.HangoutInjection.prototype.doLayout = function() {
  if (this.isGameActive()) {
    var videoPanes = this.videoDisplay.parentNode.childNodes;
    for (var i = 0; i < videoPanes.length; i++) { // Mute everything.
      var pane = videoPanes[i];
      if (pane.id != this.VIDEO_ID) {
        pane.setAttribute('style', 'display: none;');
      }
    }
    this.gameDisplay.removeAttribute('style');
    this.videoDisplay.childNodes[0].setAttribute('style', 'height: 1px; width: 1px;');
  }
};

/**
 * Check if the game is active.
 */
hangout.injection.HangoutInjection.prototype.isGameActive = function() {
  return this.gameNode.classList.contains(this.TOOLBAR_CHECKED_CLASS_ID);
};

/**
 * Render the game button on the toolbar on the left panel.
 */
hangout.injection.HangoutInjection.prototype.renderGameButton = function() {
  this.gameNode = this.youtubeNode.cloneNode(true);
  this.gameNode.classList.remove(this.YOUTUBE_CLASS_ID);
  this.gameNode.classList.add('hangout-games');
  this.gameNode.setAttribute('id', ':rg');
  this.gameNode.querySelector('.hangout-toolbar-text').innerHTML = 'Code Share';
  var gameImage = this.gameNode.querySelector('.hangout-toolbar-icon');
  gameImage.style.backgroundImage = 'url(chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/img/labs-toolbar.png)';
  this.gameNode.addEventListener('click', this.onGameButtonClick.bind(this));
  this.youtubeNode.parentNode.appendChild(this.gameNode);
  
  // We need Wave!
  this.simulateClick(this.youtubeNode);
  this.simulateClick(this.youtubeNode);
};

/**
 * Render the game canvas initially hidden
 */
hangout.injection.HangoutInjection.prototype.renderGameCanvas = function() {
  this.videoDisplay = $(this.VIDEO_ID);

  // Create the iframe that points to the game component.
  this.gameFrame = document.createElement('iframe');
  this.gameFrame.src = chrome.extension.getURL('code.html');
  this.gameFrame.setAttribute('frameBorder', '0');
  this.gameFrame.style.width = '100%';
  this.gameFrame.style.height = '100%';
  
  // Add the iframe to a div in side the video pane. So we can control the toggle behaviour.
  this.gameDisplay = document.createElement('div');
  this.gameDisplay.classList.add('CSS_LAYOUT_COMPONENT');
  this.gameDisplay.style.display = 'none';
  this.gameDisplay.appendChild(this.gameFrame);

  // Add it right before the video pane since order matters.
  var videoPane = this.videoDisplay.parentNode;
  videoPane.insertBefore(this.gameDisplay, this.videoDisplay.previousSibling);
};

/**
 * Fired when the hangout button has been clicked.
 */
hangout.injection.HangoutInjection.prototype.onGameButtonClick = function(e) {
  e.currentTarget.classList.toggle(this.TOOLBAR_CHECKED_CLASS_ID);
  if (this.isGameActive()) { // VISIBLE
    this.doLayout();
    chrome.extension.sendRequest({ method: 'GadgetReady' });
    this.youtubeNode.style.display = 'none';
  }
  else { // NOT VISIBLE
    this.gameDisplay.style.display = 'none';
    this.videoDisplay.childNodes[0].removeAttribute('style');
    this.youtubeNode.style.display = 'inline-block';
  }
};

/**
 * Simulate a full click event on a specific element.
 * @param {HTMLElement} element the element to click.
 */
hangout.injection.HangoutInjection.prototype.simulateClick = function(element) {
  var clickEvent = document.createEvent('MouseEvents');
  clickEvent.initEvent('mousedown', true, true);
  element.dispatchEvent(clickEvent);
  
  clickEvent = document.createEvent('MouseEvents')
  clickEvent.initEvent('click', true, true);
  element.dispatchEvent(clickEvent);
  
  clickEvent = document.createEvent('MouseEvents')
  clickEvent.initEvent('mouseup', true, true);
  element.dispatchEvent(clickEvent);
};

// Inject
var injection = new hangout.injection.HangoutInjection();
injection.init();