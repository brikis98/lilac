# Overview

This project shows an example of how to use [node.js](http://nodejs.org/) to:

* Share [backbone.js](http://documentcloud.github.com/backbone/) models between server and client.
* Share [dust](http://akdubya.github.com/dustjs/) templates between server and client.
* Split up rendering between server and client. In particular, data will render *as soon as it is available*, whether that is while still processing on the server or after the page has already reached the client's browser.

Currently, this is more of a code sample than a full fledged library, but I'll work on turning it into an npm module soon.
