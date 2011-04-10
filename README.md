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

The page that shows up isn't very exciting, but how it got there is: part of it was rendered server-side and part of it was rendered client side, depending on when the data was available. Better still, the rendering was done using the *same* [dust](http://akdubya.github.com/dustjs/) templates. Now, disable JavaScript and reload the page (or just go to [http://localhost:8124/?noScript=true](http://localhost:8124?noScript=true)). The page still loads and looks the same, but this time, all the content was rendered server-side. 

# How does it work?

## Step 1: the server

Start by looking at `server.sj`:

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

The first step is to create a number of [backbone](http://documentcloud.github.com/backbone/) models and put them into a backbone collection. Each model represents some sort of data we need to render the page, typically retrieved from an external endpoint (database, cache, web service). For this demo app, remote calls that take time are replaced with a simple `setTimeout` call using the model's delay property. These models will also specify various rendering parameters, such as which template to use and where they can be rendered (server-only, client-only, both). Calling collection.fetch() fires off asynchronous requests to actually fetch the data for all the models (or, in our case, calls setTimeout). However, we don't wait for any of these requests to complete: instead, we call `lilac.render` to start rendering the `index` template immediately. 

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

The server renders as much of the data as is available and returns a partially complete page to the client. At this point, the client's browser uses [nowjs](http://nowjs.com/) to open a socket back to the server (using whatever 'socket' technology is available in the current browser) and requests the remaining data (identified in the cookie via collection.id):

    now.ready(function() {
      now.getModelsToRender($.cookie('collection.id'), render);
    });
    
This request is handled by lilac, which looks through goes through each of the unrendered models and pushes it to the client as soon as the data is available:

    if (model.get('isRendered')) {
      return;
    } else if (model.get('isFetched')) {
      callback(model);
    } else {
      model.bind('change', _.once(function(model) { callback(model); }));
    }

The client, in turn, sits and listens for these remaining models and uses dust to render each one in the browser when it receives the data from the server:

    dust.render(model.template, model, function(err, out) {
      if (err) {
        console.log(err); 
      } else {
        $('#collections').append(out);
      }
    });	