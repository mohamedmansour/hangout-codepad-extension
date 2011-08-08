/**
 * Main Game controller that controlls a single game instance.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
GameController = function() {
  this.engine = null;
};

/**
 * Initilaization routine for first load.
 */
GameController.prototype.init = function() {
  window.addEventListener('load', this.onWindowLoad.bind(this), false);
};

/**
 * Event when windows has completely loaded.
 */
GameController.prototype.onWindowLoad = function() {
  chrome.extension.onRequest.addListener(this.onExtensionRequest.bind(this));
  $('btnStart').addEventListener('click', this.onGameStart.bind(this), false);
  // For now, it is just the pong game.
  this.engine = new hangout.pong.Engine();
  this.engine.init();
};

/**
 * Starts the game selected.
 */
GameController.prototype.onGameStart = function() {
  this.engine.start();
  // Test data every time.
  if ($('chkTestData').checked) {
    this.engine.addPlayer('mohamed'); 
    this.engine.addPlayer('john');
    this.engine.addPlayer('bob');
  }
  // Tell the background the game has started.
  chrome.extension.sendRequest({method: 'LabStarted'});
};

/**
 * Fetches Information regarding the current game. Such as the game state
 * when it started, players, etc.
 *
 * @return {object} the game status object.
 */
GameController.prototype.getGameStatus = function() {
  return {
    running: this.engine ? true : false
  };
};

/**
 * Google Plus has an HTML5 push API. This somehow doesn't play well with 
 * DOMSubtreeModified so something like this will fix issues where the posts
 * do not get updated when we visit another tab.
 *
 * @param {Object} request The request sent by the calling script.
 * @param {Object<MessageSender>} sender The location where the script has spawned.
 * @param {Function} request Function to call when you have a response. The 
                              argument should be any JSON-ifiable object, or
                              undefined if there is no response.
 */
GameController.prototype.onExtensionRequest = function(request, sender, sendResponse) {
  var gameStatus = this.getGameStatus();
  if (request.method == 'ParticipantJoined') {
    this.engine.addPlayer(request.data);
  }
  else if (request.method == 'ParticipantParted') {
    this.engine.removePlayer(request.data);
  }
  else if (request.method == 'ParticipantList') {
    for (var i in request.data) {
      this.engine.addPlayer(request.data[i]);
    }
  }
  sendResponse({});
};

// Main Content Script injection
var controller = new GameController();
controller.init();