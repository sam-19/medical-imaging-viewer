Medical Imaging Study Viewer
============================

## Description

This is a Javascript application for viewing medical imaging studies in the browser, using [Vue.js](https://vuejs.org/) as interface framework. The development of this application was supported by [University of Eastern Finland](https://www.uef.fi/en) using [Finnish MEDigi project](https://www.medigi.fi/en/home-page.html) funding.

The original aim of this application was to provide a way to view radiological imaging studies in [Moodle](https://moodle.org/) and to this end, there is an additional Moodle plugin for linking image resources and adding them as components to Moodle documents.

In addition to the master and 0.1 release branches, there are a couple of experiments for including electrophysiological studies in the dev branch. In addition to these features falling outside the scope of the application, the implementations themselves turned out to be non-viable, but they are included as per the terms of my contract with the university.

Due to the restrictive schedule of the master project quite a few corners had to be cut while developing this application, leaving a considerable maintenance debt. As a result, active development of this application has been discontinued in favor of a completely rewritten version TBA soon.

That said, there are some outstanding issues that I will be willing to patch, should anyone find solutions to them.

## Usage

An example distribution is available as a 0.1 release. Serve all files from the same location or edit index.html accordingly, if you want to move the script files.

## External libraries and resources

Development of this sapplication would not have been possible without numerous open source Javascript libraries and the tremendous contributions of their developers. The most important external libraries used in this project are:
- [Vue.js](https://vuejs.org) 
- [Cornerstone.js](https://cornerstonejs.org/) and its submodules
  - CornerstoneMath
  - CornerstoneTools
  - DicomParser
  - WADOImageLoader
- [Hammer.js](https://hammerjs.github.io/) (as a dependency of Cornerstone.js)

[FontAwesome](https://fontawesome.com/) 5 Pro SVG icons are used extensively in the application. Compiling the application from source is currently not possible without a compatible license.

## License (MIT)

Copyright (c) 2021 Sampsa Lohi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.