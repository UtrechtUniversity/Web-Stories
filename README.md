# Nightswim

Nightswim is an interactive storytelling engine for creating rich audiovisual
interactive stories and adventure games. It's made in JS, HTML and CSS. Nightswim 
consists of two parts: the engine and the editor. This is the engine. The editor
is a seperate project.

## Features:
- Create characters and objects and have players interact with them
- Create locations and bring them to life with images, sound and custom CSS styling
- Define game logic with conditions and consequences in JSON files
- Player inventory system
- Build in Javascript, HTML5 and CSS3
- Howler.js integration for audio playback

## Getting started
I'm working on getting documentation finished as soon as possible. It will be
available from the [Nightswim-Docs repository](https://github.com/walterjohan/Nightswim-Docs).
To start a new project:
1. Copy the template folder, put it somewhere on
your hard drive and rename it with your story's title.
2. Start editing the .json files in the template/story folder
3. Use the template generator (see below) for generating the JSON objects.
4. There's a little example story in the ./story folder, you can check it out to see how it's made.

## Nightswim Editor
Making stories in Nightswim is easiest with the Nightswim Editor. It will soon be available in the
[Nightswim-Editor repository](https://github.com/walterjohan/Nightswim-Editor).
Until then you can use the template generator (templates.html) in the template/tools
folder in combination with your code editor of choice.

## Dependencies
Nightswim includes the following (unmodified) open source components:

- jQuery: MIT License
- Howler.js: MIT License

License files for these components can be found in the lib/ directory