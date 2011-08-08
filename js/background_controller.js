/**
 * Manages a single instance of the entire application.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
BackgroundController = function() {
  this.participants = [];
  this.session_participants = null;
  this.hangout_part_join_pattern = /^(.*) (joined|left) group chat\.$/;
  this.hangout_tab_id = -1;
  this.talk_injected = false;
  this.waveData = {};
  this.onExtensionLoaded();
};

/**
 * Triggered when the extension just loaded. Should be the first thing
 * that happens when chrome loads the extension.
 */
BackgroundController.prototype.onExtensionLoaded = function() {
  var currVersion = chrome.app.getDetails().version;
  var prevVersion = settings.version;
  if (currVersion != prevVersion) {
    // Check if we just installed this extension.
    if (typeof prevVersion == 'undefined') {
      this.onInstall();
    } else {
      this.onUpdate(prevVersion, currVersion);
    }
    settings.version = currVersion;
  }
};

/**
 * Triggered when the extension just installed.
 */
BackgroundController.prototype.onInstall = function() {
  // Inject the content script to all opened window.
  chrome.windows.getAll({ populate: true }, function(windows) {
    for (var w = 0; w < windows.length; w++) {
      var tabs = windows[w].tabs;
      for (var t = 0; t < tabs.length; t++) {
        var tab = tabs[t];
        var url = tab.url;
        if (url.indexOf('https://talkgadget.google.com/hangouts') == 0) { 
          chrome.tabs.executeScript(tab.id, { file: '/js/injection/hangout_injection.js' });
        }
        else if (url.indexOf('https://googlesharedspaces.appspot.com/p/tuna') == 0) { 
          chrome.tabs.executeScript(tab.id, { file: '/js/injection/user_injection.js' });
        }
      }
    }
  });
};

/**
 * Triggered when the extension just uploaded to a new version. DB Migrations
 * notifications, etc should go here.
 *
 * @param {string} previous The previous version.
 * @param {string} current  The new version updating to.
 */
BackgroundController.prototype.onUpdate = function(previous, current) {
};

/**
 * Initialize the main Background Controller
 */
BackgroundController.prototype.init = function() {
  chrome.browserAction.onClicked.addListener(this.onBrowserActionClicked.bind(this));
  chrome.extension.onRequest.addListener(this.onExtensionRequest.bind(this));
};

/**
 * Listen for extension requests.
 *
 * @param {Object} request The request sent by the calling script.
 * @param {Object<MessageSender>} sender The location where the script has spawned.
 * @param {Function} request Function to call when you have a response. The 
                              argument should be any JSON-ifiable object, or
                              undefined if there is no response.
 */
BackgroundController.prototype.onExtensionRequest = function(request, sender, sendResponse) {
  if (request.method == 'ParticipantsReceived') {
    this.onParticipantsReceived(request.data);
    sendResponse({});
  }
  else if (request.method == 'ChatReceived') {
    this.onChatReceived(request.data);
    sendResponse({});
  }
  else if (request.method == 'LabStarted') {
    this.onLabStarted();
    sendResponse({});
  }
  else if (request.method == 'HangoutTabCreated') {
    this.onHangoutTabCreated(sender.tab.id);
    sendResponse({});
  }
  else if (request.method == 'TalkInjected') {
    sendResponse({data: this.talk_injected});
    if (!this.talk_injected) {
      this.talk_injected = true;
    }
  }
  else if (request.method == 'LogReceived') {
    this.onLogReceived(request.data);
    sendResponse({});
  }
  else if (request.method == 'WaveReceived') {
    this.onWaveReceived(request.data);
    sendResponse({});
  }
  // ===================================================
  else if (request.method == 'GadgetReady') {
     this.sendToHangoutTab({method: 'GadgetReady'});
  }
  else if (request.method == 'GadgetInit') {
    var codrID = this.onGadgetInit();
    sendResponse({method: 'GadgetInit', data: codrID});
  }
  // ===================================================
  else {
    sendResponse({});
  }
};

/**
 * Event when game has started. Send the list.
 */
BackgroundController.prototype.onLabStarted = function() {
  this.sendToHangoutTab({ method: 'ParticipantList', data: this.participants });
};

/**
 * Event when a chat message has been received.
 *
 * @param {Object} data The chat response object.
 */
BackgroundController.prototype.onChatReceived = function(data) {
  console.log('ChatReceived', data);
  if (data.from == 'g') { // Google Event
    var matchJoinPart = data.line.match(this.hangout_part_join_pattern);
    if (matchJoinPart) {
      var name = matchJoinPart[1];
      var state = matchJoinPart[2];
      if (state == 'joined') {
        this.onJoin(name);
      }
      else { // left
        this.onPart(name);
      }
    }
  }
};

/**
 * When the gadget initially loaded.
 */
BackgroundController.prototype.onGadgetInit = function() {
  var codrID = this.waveData.code;
  if (!codrID) {
    var req = new XMLHttpRequest();
    req.open('GET', 'http://codr.cc', false);
    req.send(null);
    if (req.status == 200) {
      var matches = req.responseText.match(/value="http:\/\/codr\.cc\/([a-z0-9]+)"/);
      if (matches) {
        codrID = matches[1];
        this.sendToHangoutTab({method: 'SendMessage', data: {code: codrID}});
      }
    }
  }
  return codrID;
};


/**
 * Event when a user has joined the hangout.
 *
 * @param {string} name the player name.
 */
BackgroundController.prototype.onJoin = function(name) {
  console.log('ParticipantJoined', name);
  var userIndex = this.participants.indexOf(name);
  if (userIndex == -1) {
    this.participants.push(name);
    this.sendToHangoutTab({method: 'ParticipantJoined', data: name});
  }
};

/**
 * Event when a user has parted the hangout.
 *
 * @param {string} name the player name.
 */
BackgroundController.prototype.onPart = function(name) {
  console.log('ParticipantParted', name);
  var userIndex = this.participants.indexOf(name);
  if (userIndex != -1) {
    this.participants.splice(userIndex, 1);
    this.sendToHangoutTab({method: 'ParticipantParted', data: name});
  }
};

/**
 * Event when a participant been received.
 *
 * @param {Object} data The chat response object.
 */
BackgroundController.prototype.onParticipantsReceived = function(data) {
  this.session_participants = data;
};

/**
 * Listens when the browser action has been clicked. Opens up a new window to run the canvas.
 *
 * @param {Object} tab The current tab that the browser action is referring to.
 */
BackgroundController.prototype.onBrowserActionClicked = function(tab) {
  chrome.windows.create({url: chrome.extension.getURL('game.html'), width: 500, height: 500, type: 'popup' });
};

/**
 * When hangout tab created, it needs to persist the tab id.
 *
 * @param {Object} tab The current tab that the browser action is referring to.
 */
BackgroundController.prototype.onHangoutTabCreated = function(tabid) {
  this.hangout_tab_id = tabid;
  this.waveData = {};
};

/**
 * Log message received from other extension and content script pages.
 *
 * @param {string} message The message to log.
 */
BackgroundController.prototype.onLogReceived = function(message) {
  console.log('Log', message);
};

/**
 * When new wave messages have been received.
 *
 * @param {Object} message The wave request object.
 */
BackgroundController.prototype.onWaveReceived = function(message) {
  console.log('WaveReceived', message.data.value);
  this.waveData = JSON.parse(message.data.value);
};

/**
 * Find the participant object by name so we get more information.
 *
 * @param {string} name The name to find.
 * @return {object} The user object that has {displayName, id, presence, thumbnameUrl}
 */
BackgroundController.prototype.findParticipantByName = function(name) {
  var users = this.session_participants.participants;
  for (var key in users) {
    if (users.hasOwnProperty(key)) {
      var item = users[key];
      if (item.displayName == name) {
        return item;
      }
    }
  }
  return null;
};

/**
 * The Google+ ID for this hangout for the current user..
 *
 * @return {long} The hangout Google Plus ID.
 */
BackgroundController.prototype.getMyID = function() {
  return this.session_participants ? this.session_participants.myId : -1; 
};

/**
 * The Google Plus Hangout authors ID who started the hangout.
 *
 * @return {long} The hangout Google Plus ID.
 */
BackgroundController.prototype.getAuthorID = function() {
  return this.session_participants ? this.session_participants.authorId : -1; 
};

/**
 * Send the data to the hangout window.
 *
 * @param {object} data The data payload as a JSON object.
 */
BackgroundController.prototype.sendToHangoutTab = function(data) {
  chrome.tabs.sendRequest(this.hangout_tab_id, data);
};
