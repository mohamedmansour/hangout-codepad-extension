Prototype Version
---------------------
![Prototype Chrome Extension](https://github.com/mohamedmansour/hangout-codepad-extension/raw/master/screenshots/prototype-v1.png)

How Does it work?
---------------------

Google Hangouts uses Google Wave Gadgets from Google Shared Spaces. This extension taps into the wave technology directly and intercepts all the messages and has a basic API that the extension developer can send messages back to into the wave.

This uses techniques that I have implemented in the Facebook Friend Exporter that I explained on my outdated blog http://goo.gl/tZiFh

In order for me to modify the internal JavaScript variables from Google+ Hangouts, I had to do unique messaging, that allows me to transfer data from many contexts.

DOM JavaScript Context <-> Content Script Context <-> Extension Context

