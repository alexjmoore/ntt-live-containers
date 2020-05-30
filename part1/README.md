# Instructions for Part 1 of the NTT Live Containers session

These are the core instructions to walk through the introduction, there is a separate PowerPoint with more context.
The instructions here are more the steps to carry out with a brief explanation, they are not a full substitute for
the full session itself where we go into more details around the underlying technology.

Today we're going to explore use of containers and Docker to deploy a very simple 3 tier application consisting of:

* NGINX webserver with static web content
* Go based API application mid-tier
* MongoDB based database backend

### Prerequisites

Almost nothing really, in order to follow along you can either install Docker Desktop on your client locally by going
here:

* [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

Or even more simply, you can use 'Play with Docker' and perform everything in a browser, available here:

* [https://labs.play-with-docker.com/](https://labs.play-with-docker.com/)

In both cases you'll need to clone this repository with:

```
git clone https://github.com/alexjmoore/ntt-live-containers.git
```

Git is available automatically on Play with Docker, but you may need to install git see:

* [https://git-scm.com/download/](https://git-scm.com/download/)

Note the instructions below assume you are using Docker Desktop, the only change iff you are using 'Play with Docker'
is any time we are referencing `http://localhost:8080` you will need to click the `8080` link next to the 'Open Port'
button in the 'Play with Docker' interface.

## Starting our first container - NGINX

1. If you look in [this directory](web/content) you will see we have some simple static web content with some html, js
and css files.  Our first task is to deploy a simple webserver to serve these.  We can do this using the public NGINX
image, `cd part1/web` if not already and run the following:

```
docker run --name webserver -v ${PWD}/content:/usr/share/nginx/html:ro -d -p 8080:80 nginx
```

Observe how it downloaded multiple layers that constitute the upstream NGINX image, you can see if you webserver is
running by executing:

```
docker ps
```

And of course by navigating to [http://localhost:8080](http://localhost:8080)

You can also see the image that was downloaded with:

```
docker image list
```

2. You can see in the original command we are using the `-v` flag to mount a local directory where the content is stored, experiment with changing some of the HTML directly in the content and see how that reflects instantly.


3. Another option is to copy the content into the image by building our own, let's try this, first we need to remove
our running webserver, then we build a new one copying the content in, then we can start this new container from our
new local image:

```
docker rm -f webserver
docker build --rm -t ntt-live-nginx .
docker run --name webserver -d -p 8080:80 ntt-live-nginx
```

Notice we don't need reference the local directory, but the content is still there, the `build` command used a
Dockerfile that is in the current directory, take a look at the instructions there to see how that functions.

You can also see the new container running and how we now have a new image locally:

```
docker ps
docker images list
```

But now if you try changing the HTML content, it does not immediately reflect in the image itself.  There are pros and
cons to including content in this way and which route you choose depends very much on the specific scenario.

If the container has the tools available, which is the case here, you can execute other processes within a running
container, for example we can go and find our content within our running webserver by executing:

```
docker exec -it webserver bash
```

When you are done simply type `exit` to return back to your host.

## Adding our API application

You may have already seen, but if you pop out the menu in the top left of the webpage there is a Pokémon App which
loads a different page.  This is the HTML frontend that will connect to our API application.  If you look in the
[web/content/js/pokemon.js](web/content/js/pokemon.js) file you will see it is connecting to `/app/pokemon` as the
endpoint.  However right now we have two challenges, first we don't have our app running, second, we need to route
requests to it.

1. Lets get our app up and running first, `cd ../app` and lets build our app.  This is a fairly simple Go
RESTful(ish) app that will listen on port TCP/4242.  We can build the image again using a different Dockerfile in the
app directory, this time we are using a different upstream image and we are compiling our Go app within it, execute the
build with:

```
docker build --rm -t app .
```

Notice too how we are using the ENV parameter to pass environment variables through to the container which is then used
by the application.  These can then also optionally be overridden on start up of the container.

One of the nice things about using Go is that it can be compiled into a static binary executable and this is a great
case for using a feature called 'multi-stage' builds.  If you look at the newly build "app" image with `docker image
list app` you will see a 900+MB image.  With a multi-stage build, we can use the same golang image to conduct the
build but then switch to a `scratch` (essentially totally empty) image and copy the newly built binary into it, look
at the `Dockerfile.multi` for details on how this is achieved.  Let's rebuild our image using this, run:

```
docker build --rm -t app -f Dockerfile.multi .
```

Now if yo look at `docker image list app` you will see a 11MB image, much much smaller, plus it only contains our
binary, so a much lower attack surface should it be compromised.

2. Now we have our image for our image we need to start it, but one key aspect we need to change now is networking by
default in Docker containers can speak to each other by IP but not resolve their names, we need to create a new user
defined network then we can start our app container attached to it, run:

```
docker network create app-net
docker run --name app --network app-net -d app
```

Note here we are not passing any port option to Docker, this is because NGINX will be the external path to reach our
app, so it doesn't need to be exposed externally.

3. Next we need to tell NGINX that `/app` should proxy to our app API, we need to do two things here, first we need
to attach the webserver to the same user defined network so it can resolve the `app` hostname, then we need to update
the NGINX configuration with a `proxy_pass` entry for `/app`.  There is a ready made configuration which we can map
into our container in the web directory, `cd ../web` again and restart the webserver with the following:

```
docker rm -f webserver
docker run --name webserver -v ${PWD}/nginx.conf:/etc/nginx/nginx.conf -d -p 8080:80 --network app-net ntt-live-nginx
```

Now we should be able to go to [http://localhost:8080/api](http://localhost/api) and see a response from our API
app!  You can also check logs of both the API app to see the request and the webserver with:

```
docker logs app
docker logs webserver
```

This will show you the output from both containers, very useful for debugging.

## Adding our database backend

Now we have our webserver and our API app containers running, but no database for our app to query, let's fix that!

1. As per the Go code this needs to be on the hostname `db` (of course in reality this would be configurable), so we
shall go grab the standard MongoDB image start it, making sure we attach it to our network.  Run:

```
docker run --name db --network app-net -d mongo
```

Note that as we did for the app, we don't need to tell docker to expose the port, as it is only connected to from
inside our application, not externally.

2. Now we have an empty database, so we need to populate it, we have a small script that will go grab our sample
dataset and then populate it into the database, it also then creates as a wildcard text index so we can search it
simply.  If you `cd ../db` and then run:

```
./import.sh -d db
```

You will see it load our dataset.  And we're done....navigate to
[http://localhost:8080/pokemon.html](http://localhost:8080/pokemon.html) and try to search for "Pikachu" or "Ice",
or leave blank to pull them all.  Note that this demo app does not support partial queries as MongoDB doesn't either
out of the box, but this could be a future enhancement.

## Stitching it all together

So far we have learnt a lot about how Docker containers are constructed and built, but running each of these by hand
is quite cumbersome.  Thankfully there is a way to group these together into a single configuration known as 'docker-compose', examine the `docker-compose.yml` file.  We can swap our manually deployed containers with a simple
couple of commands, `cd ..` back to the `part1` directory then run:

```
docker stop $(docker ps -a -q)
docker-compose -p ntt-live up -d
db/import.sh -d ntt-live_db_1
```

Note we had to re-import our database as we were starting a new container.

Of course, deploying and running containerised applications at scale requires more than a simple configuration, this is
where Container Orchestrators like Kubernetes come to play...for that we have part 2.

## Clean up

Finally, once you're done you are going to want to clean up, lets 'down' our stack and optionally you can prune
the system, note this will remove all the configuration and images, if you're a regular Docker user or if you want to
continue experimenting hold off on the prune itself.

```
docker-compose -p ntt-live down
docker system prune
```





