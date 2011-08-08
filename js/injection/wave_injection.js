/**
 * Responsible of managing communication back and fourth Wave API and Google Chrome Extensions.
 * @constructor
 */
hangout.injection.WaveInjection = function() {
  this.transferSendDOM = document.createElement('div');
  this.transferSendDOM.setAttribute('id', 'transfer-send-dom-area');
  this.transferSendDOM.style.display = 'none';

  this.transferReceiveDOM = document.createElement('div');
  this.transferReceiveDOM.setAttribute('id', 'transfer-receive-dom-area');
  this.transferReceiveDOM.style.display = 'none';
  
  this.waveTransferEvent = document.createEvent('Event');
  this.waveTransferEvent.initEvent('waveEvent', true, true);
};

/**
 * Initializes all the scripts for the Wave API.
 */
hangout.injection.WaveInjection.prototype.init = function() {
  document.body.appendChild(this.transferSendDOM);
  document.body.appendChild(this.transferReceiveDOM);
  window.addEventListener('waveEvent', this.onWaveDataReceived.bind(this));
  chrome.extension.onRequest.addListener(this.onExtensionRequest.bind(this));
  this.injectWaveOverride();
};

/**
 * Fired when Wave Data has been received.
 */
hangout.injection.WaveInjection.prototype.onWaveDataReceived = function(e) {
  var protocol = this.transferReceiveDOM.innerText;
  if (protocol.indexOf('C ') == 0) {
    var message = JSON.parse(protocol.substring(2));
    chrome.extension.sendRequest({ method: 'WaveReceived', data: message });
  }
};

/**
 * Injects some scripts into the Wave API so both worlds can access it.
 */
hangout.injection.WaveInjection.prototype.injectWaveOverride = function() {
  var waveInject = function() {
    DEBUG = true;
    var transferSendDOM = document.getElementById('transfer-send-dom-area');
    var transferReceiveDOM = document.getElementById('transfer-receive-dom-area');
    var waveTransferEvent = document.createEvent('Event');
    waveTransferEvent.initEvent('waveEvent', true, true);

    // Invoke a call back to the extension that an event has been received.
    var invoke = function(e) {
      transferReceiveDOM.innerText = 'C ' + JSON.stringify(e);
      window.dispatchEvent(waveTransferEvent);
    };

    // Listen on wave data being received. This is to catch extension request.
    // The extension world needs to know about some internal javascript
    // variable. This will be long.
    var onWaveDataReceived = function(e) {
      var protocol = transferSendDOM.innerText;
      if (protocol.indexOf('E ') == 0) {
        var message = JSON.parse(protocol.substring(2));
        if (message.method == 'GetParticipants') {
          invoke({method: 'ParticipantsReceived', data: wave.getParticipants()});
        }
        if (message.method == 'GetParticipantById') {
          invoke({method: 'ParticipantIDReceived', data: wave.getParticipantById(message.data)});
        }
        else if (message.method == 'SendMessage') {
          wave.submitDelta({hangout:  JSON.stringify(message.data)});
        }
      }
    };
    window.addEventListener('waveEvent', onWaveDataReceived);
    
    // State changes.
    var onStateChange = function(state, changedState) {
      if (changedState.hangout) {
        invoke({method: 'StateChanged', data: changedState.hangout});
      }
    };
    wave.setStateCallback(onStateChange);
  };

  var script = document.createElement('script');
  script.setAttribute('id', 'inject-area');
  script.appendChild(document.createTextNode('(' + waveInject + ')();'));
  document.body.appendChild(script);  
};

/**
 * Invoke the Wave API since some data is ready to be received.
 * @param{Object} payload A JSON object representing some payload.
 */
hangout.injection.WaveInjection.prototype.invokeWave = function(payload) {
  this.transferSendDOM.innerText = 'E ' + JSON.stringify(payload);
  window.dispatchEvent(this.waveTransferEvent);
};

/**
 * Listens on external extension requests from the Chrome API.
 * @see chrome.extension.sendRequest API
 */
hangout.injection.WaveInjection.prototype.onExtensionRequest = function(request, sender, sendResponse) {
  this.invokeWave(request);
  sendResponse({});
};

// Start ... vr000m
var injection = new hangout.injection.WaveInjection();
injection.init();
chrome.extension.sendRequest({method: 'LogReceived', data: 'Wave Injected'});