# Overview

This project shows an example of how to use [node.js](http://nodejs.org/) to:

* Share [backbone.js](http://documentcloud.github.com/backbone/) models between server and client.
* Share [dust](http://akdubya.github.com/dustjs/) templates between server and client.
* Split up rendering between server and client. That is, an attempt is first made to render server-side any data that is available; the rest of the rendering is deferred to the client-side.

Currently, this is more of a code sample than a re-usable library, but I'll work on turning it into an npm module soon.

# Install

1. Install [node.js](http://nodejs.org/), [backbone.js](http://documentcloud.github.com/backbone/), [dust](http://akdubya.github.com/dustjs/), [underscore](http://documentcloud.github.com/underscore/), [express](http://expressjs.com/) and [nowjs](http://nowjs.com/).
1. Download and extract the source code for this project
1. Run: `node server.js`
1. Go to [http://localhost:8124](http://localhost:8124/)

The page that shows up isn't very exciting, but how it got there is: part of it was rendered server-side and part of it was rendered client side. Now, disable JavaScript and reload the page (or just go to [http://localhost:8124/?noScript=true](http://localhost:8124?noScript=true)). The page still loads and looks the same, but this time, all the content was rendered server-side. 