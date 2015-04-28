# Update

This project was an experiment from around 2011 and is **no longer maintained**. Check out [rendr](https://github.com/rendrjs/rendr), [meteor](http://isomorphic.net/library/meteor), [derby](http://isomorphic.net/library/derby), and [isomorphic.net](http://isomorphic.net/) for better alternatives.

# Overview

This project shows an example of how to use [node.js](http://nodejs.org/) to:

* Share [backbone.js](http://documentcloud.github.com/backbone/) models between server and client.
* Share [dust](http://akdubya.github.com/dustjs/) templates between server and client.
* Split up rendering between server and client. 

The general idea is to request all the data necessary for a page asynchronously and start rendering server-side without waiting for the data to come back. Whatever data does make it back in time is included in the response to the browser; the rest is *pushed* via [socket.io](http://socket.io/) to the browser and rendered client-side.

Currently, this is more of a code sample than a re-usable library, but I'll work on turning it into an npm module soon.

# Why would I want this?

* Render pages **fast**. As soon as data is available, it will start showing up in the user's browser. Lilac uses async rendering, early flush and client side rendering to vastly improve actual and perceived page load times.
* Keep your code [DRY](http://en.wikipedia.org/wiki/Don%27t_repeat_yourself) by sharing the same model and template code between server and client.
* Supports client-side rendering: keeping your templates in JavaScript files allows you to store them on CDN's (lower latency, less load for your servers), lets the user's browser cache them, and can be re-used for re-drawing parts of the page in response to user actions or AJAX calls.
* Supports server-side rendering: the same templates can be rendered server side to support crawlers and users without JavaScript.

# Install

1. Install [node.js](http://nodejs.org/) 
1. Run: `git clone https://github.com/brikis98/lilac.git`
1. Run: `npm install`
1. Run: `node server.js`
1. Go to [http://localhost:8124](http://localhost:8124/)

The page that shows up isn't very exciting, but how it got there is: part of it was rendered server-side and part of it was rendered client side, depending on when the data was available. Better still, the rendering was done using the *same* [dust](http://akdubya.github.com/dustjs/) templates. Now, disable JavaScript and reload the page (or just go to [http://localhost:8124/?noScript=true](http://localhost:8124?noScript=true)). The page still loads and looks the same, but this time, all the content was rendered server-side.  

# How does it work?

## Step 1: the server
    // server.js
    
    app.get('/', function(req, res, next) {
      var collection = new Collections.DelayedCollection([
        new Models.DelayedModel(), 
        new Models.DelayedModel({allowRendering: 'client-only'}),
        new Models.DelayedModel({delay: 200, allowRendering: 'server-only'}), 		
        new Models.DelayedModel({delay: 500}), 		
        new Models.DelayedModel({delay: 1000})
      ]);	
      collection.fetch();
      lilac.render(req, res, collection, 'index');
    });

The first step is to create a number of [backbone](http://documentcloud.github.com/backbone/) models and put them into a backbone collection. Each model represents some sort of data we need to render the page, typically retrieved from an external endpoint (database, cache, web service). For this example app, the remote calls are demoed simply by calling `setTimeout` for the amount of time specified in the model's `delay` property. These models will also specify various rendering parameters, such as which template to use and where they can be rendered (server-only, client-only, both). Calling collection.fetch() fires off asynchronous requests to fetch the data for all the models (or, in our case, calls setTimeout). However, we don't wait for any of these requests to complete: instead, we call `lilac.render` to start rendering the `index` template immediately. 

    // templates/index.jst
    
    <table id="collections">
      <tr>
        <th>Delay</th>
        <th>Allows rendering on</th>
        <th>Actually rendered</th>
      </tr>
      {#collection}
        {#renderIfReady/}
      {/collection}
    </table>

The `index` template (lilac/templates/index.jst) uses [dust](http://akdubya.github.com/dustjs/) syntax to loop over our collection and call `renderIfReady` on it. The `renderIfReady` method is a lilac method added to the dust context which does the following (simplified for easier reading):

    // lib/lilac.js
    
    if (model.get('isFetched')) {	
      renderFetchedModel(chunk, model);
    } else if (context.get('noScript')) {
      model.bind('change', _.once(function() { renderFetchedModel(chunk, model); }));
    } else {
      chunk.end(0);
    }

This may look a bit complicated, but it boils down to this:

1. If the data for the model has already been fetched, render it immediately on the server side.
1. If the data for the model isn't available yet, but the client doesn't have JavaScript, bind to the models `change` event and render on the server side as soon as the data comes in.
1. Otherwise, render nothing now and defer rendering to the client-side.

## Step 2: the client

The server renders as much of the data as is available and returns a partially complete page to the client. At this point, the client's browser uses [nowjs](http://nowjs.com/) to open a socket back to the server - using whatever 'socket' technology is available in the current browser - and requests the remaining data (identified in the cookie via collection.id):

    // public/javascripts/lilac.js
    
    now.ready(function() {
      now.getModelsToRender($.cookie('collection.id'), render);
    });
    
This request is handled by lilac, which looks through goes through each of the unrendered models and pushes it to the client as soon as the data is available:

    // lib/lilac.js
    
    if (model.get('isRendered')) {
      return;
    } else if (model.get('isFetched')) {
      callback(model);
    } else {
      model.bind('change', _.once(function(model) { callback(model); }));
    }

The client, in turn, sits and listens for these remaining models and uses dust to render each one in the browser when it receives the data from the server:

    // public/javascripts/lilac.js
    
    dust.render(model.template, model, function(err, out) {
      if (err) {
        console.log(err); 
      } else {
        $('#collections').append(out);
      }
    });	

# The fine details

## Initialize the server

    // Create your server using express, http or the other standard modules
    var app = express.createServer();

    // pull in the lilac module
    var lilac = require('./lib/lilac');
    
    // call lilac's initialize method to tell it to start accepting nowjs requests for models
    lilac.initialize(app);    

## Backbone models

In order to share backbone.js models and collections between the client and server, the `models.js` and `collections.js` files add some [CommonJS](http://www.commonjs.org/) module code at the top:

    // models/models.js
    
    Models = {};
    if (typeof exports !== 'undefined') {
      Models = exports;

      _ = require('underscore')._;
      Backbone = require('backbone');
    } 

The example app uses instances of `DelayedModel` backbone models. In the future, lilac should be able to use any backbone model that exposes the following properties:

* `isFetched`: specifies if the data for the model is available for rendering.
* `isRendered`: specifies if the model has been rendered already.
* `template`: the dust template to use for rendering.
* `delay`: for the demo app, time-consuming calls to external endpoints (database, cache, service) are simulated by a `setTimeout` call for `delay` milliseconds.
* `allowRendering`: specifies if lilac should render this model `server-side`, `client-side` or `both`.

Note: these properties will probably be namespaced in the future to avoid collisions.

## JavaScript detection

    // templates/index.jst
    
    <noscript>
      <meta http-equiv="refresh" content="0;url=/?noScript=true"/>
    </noscript>     

The `index.jst` template detects users without JavaScript and immediately refreshes the page, adding a noScript=true parameter. Lilac detects this parameter and forces all rendering to be done server-side. Depending on your needs, there are alternative schemes can be used, such as:

1. Including the same meta refresh tag as above, but without any noscript tags around it and a longer delay. You then also add some JS code that disables this meta tag before it has a chance to act.
1. If a user shows up to your site and has no cookies, have the server write a session cookie and return an initial page with a meta refresh tag and some JS code to write a second cookie. Then, if a request comes in that does have a session cookie but not the second cookie, you can assume they don't have JS available in the browser.
1. The same code as above, but also some additional JS code on each page that will detect if JS suddenly *is* available and react accordingly. Useful so a user doesn't become permanently stuck in noScript mode if they temporarily had JS disabled, your site had a bug, etc. 

## Caching and client-side rendering

Currently, lilac just caches all collections in an in-memory JavaScript object with sequential ids.

    // lib/lilac.js
    
    exports.cacheCollection = function(req, res, collection) {
      var collectionId = _.size(collectionCache);
      collectionCache[collectionId] = collection;
      return collectionId;
    }
    
The ids are added to a cookie:

    // lib/lilac.js
    
    res.cookie('collection.id', collectionId, {httpOnly: false});
    
The client uses nowjs to request unrendered models using this id:

    // public/javascripts/lilac.js
    
    now.getModelsToRender($.cookie('collection.id'), render);     
  
And the id is just used to retrieve the corresponding collection from the cache:

    // lib/lilac.js
        
    exports.getCollectionFromCache = function(collectionId) {
      return collectionCache[collectionId];
    }  

**Warning**: In real-world usage, you would want to override lilac's `cacheCollection` and `getCollectionFromCache` methods to:

* Generate your own ids
* Ensure clients can only access the collections that belong to them
* Store the data externally, e.g. [redis](https://github.com/mranney/node_redis)

## Early flush

While rendering on the server-side, lilac takes every opportunity to start sending data back to the user's browser:

    function render(template, context, res) {
      var stream = dust.stream(template, context);
      stream.on('data', function(data) { res.write(data); });
      stream.on('end', function() { res.end(); });
      stream.on('error', function(err) { res.end(err); });
    }
    
Any time some of the template is available to render, lilac will push it to the user's browser, which can significantly improve perceived load time.

## User experience

It's worth mentioning that rendering client-side and having data suddenly pop into the page and move things around can be a pretty jarring experience for the user. For real-world usage, you may want to tweak the client-side rendering method to buffer the rendered data until it's all available and then fade it in smoothly.
    
    // public/javascripts/lilac.js
    
    function render(model) {
      if (!model) { return; }
      dust.render(model.template, model, function(err, out) {
        if (err) {
          console.log(err); 
        } else {
          // You may want to buffer this data and only render it at the very end
          $('#collections').append(out);
        }
      }); 
    }  

# TODO

1. If everything rendered on the server-side, make sure the client doesn't open up an unnecessary socket to request data.
1. Modularize the collection caching code so users of lilac can specify their own. 
1. Allow the base dust context to be passed into lilac as a parameter during rendering and/or initialization.
1. Wrap the client-side code with backbone views and show how to re-use the templates client side after some AJAX action.
1. Put the lilac model data into its own namespace so it doesn't collide with user data in the model.
1. Add `allowRendering` value for data that only renders client-side (e.g. ads) and doesn't need to render server side, even if JavaScript is disabled.
1. Modularize the JavaScript detection so users of lilac can specify how to detect it (e.g. noscript with meta-refresh) and how to track it (e.g. session, cookies, URL param).    
1. Offer a way to categorize data into groups: 'above the fold' (fetch data and render immediately), 'just below the fold' (fetch data, but don't render until the user scrolls) and 'way below the fold' (don't fetch or render until the user scrolls enough that this is 'just below the fold')

# Dust watcher

I've included a utility class to make it easier to work with [dust](http://akdubya.github.com/dustjs/) templates server-side and client-side by auto-compiling and packaging your dust templates every time you make a change. Under the lib folder, the `watcher.js` file exports a function called watch:

    exports.watch = function(dust, templateDir, publicDir, templateExtension)

This function watches `templateDir` for changes. Each time a file with extension `templateExtension` changes, the watcher will use the provided `dust` instance to recompile the template, making the new version instantly accessible in your running node.js server for server-side rendering. The watcher class also puts a copy of the compiled template into `publicDir` so that it can be downloaded by the browser for client-side rendering.

Example usage:

    // server.js:
    var dust = require('dust');
    require('./lib/watcher').watch(dust, './templates', './public/templates', '.jst');

    // create ./templates/foo.jst
    Hello world!

    // ./public/templates/foo.js is automatically generated
    (function(){dust.register("foo",body_0);function body_0(chk,ctx){return chk.write("Hello world!");}return body_0;})();

    // now you can render this template client-side:
    <script type="text/javascript" src="templates/foo.js"></script>
    <script type="text/javascript">
      dust.render('foo', {}, function(err, out) { console.log(err ? err : out); }); // output: 'Hello world!'  
    </script>

    // the same code will work server side too! In server.js:
    dust.render('foo', {}, function(err, out) { console.log(err ? err : out); }); // output: 'Hello world!'

In addition to this watcher utility, I highly recommend using [node-supervisor](https://github.com/isaacs/node-supervisor) so that your node.js instance automatically redeploys any time you make a code change to it. Sure beats having to hit `ctrl+c, up-arrow, enter` each time you change server.js.

# License

(The MIT License)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
