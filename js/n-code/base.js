/**
 *  Base Code.
 */
hangout.code = hangout.code || {};

var codeFrame = document.createElement('iframe');
codeFrame.id = 'hangout-gadget';
codeFrame.width = '100%';

if (navigator.userAgent.match(/Macintosh/)) {
  alert('MAC Sad Face :-(');
  codeFrame.height = '500px';
}
else {
  codeFrame.height = '100%';
}

var onGadgetInit = function(response) {
  if (response.method == 'GadgetInit') {
    codeFrame.src = 'http://codr.cc/' + response.data;
    document.body.appendChild(codeFrame);
  }
};

var onExtensionRequest = function(request, sender, sendResponse) {
  if (request.method == 'GadgetReady') {
    var hangoutIframe = $('hangout-gadget');
    if (hangoutIframe) {
      hangoutIframe.parentNode.removeChild(hangoutIframe);
    }
    chrome.extension.sendRequest({ method: 'GadgetInit' }, onGadgetInit);
  }
};
chrome.extension.onRequest.addListener(onExtensionRequest);
