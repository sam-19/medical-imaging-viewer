Medical Imaging Study Viewer
============================

## Description

This is a Javascript application for viewing medical imaging studies in the browser, using [Vue.js](https://vuejs.org/) as interface framework. The development of this application was supported by [University of Eastern Finland](https://www.uef.fi/en) using [Finnish MEDigi project](https://www.medigi.fi/en/home-page.html) funding.

The original aim of this application was to provide a way to view radiological imaging studies in [Moodle](https://moodle.org/) and to this end, there are additional Moodle plugins for [linking image resources](https://github.com/sam-19/medimg-viewer-moodle-atto-editor-plugin) and [displaying them](https://github.com/sam-19/medimg-viewer-moodle-filter) as components in Moodle documents.

In addition to the master branch, there are a couple of experiments for including electrophysiological studies in the dev branch. In addition to these features falling outside the scope of the application, the implementations themselves turned out to be non-viable, but they are included as per the terms of my contract with the university.

Due to the restrictive schedule of the master project quite a few corners had to be cut while developing this application, leaving a considerable maintenance debt. As a result, active development of this application has been discontinued in favor of a completely rewritten version TBA soon.

That said, there are some outstanding issues that I will be willing to patch, should anyone find solutions to them.

## Usage

An example distribution is available as a 0.1 release. The chunk loader requires that you serve all files from the same location.

The application can open individual DICOM images or image series (such as CT image stacks). Open the files by dragging them onto the file drop area on then left side panel. Files can be added either individually, or in a folder. Several studies can be loaded at once and organized into separate visits. The application support the following folder struture:
```
📁 Root folder (folder name irrelevant)
 -  📁 Visit #1 (folder name is displayed in the app)
     -  📁 Single X-ray study (folder name is displayed in the app)
         -  📄 X_RAY_1.dcm (file name irrelevant)
     -  📁 Multiple image stack (folder name is displayed in the app)
         -  📄 CT_IMG_1.dcm (file name irrelevant)
         -  📄 CT_IMG_2.dcm (file name irrelevant)
         ...
         -  📄 CT_IMG_N.dcm (file name irrelevant)
 -  📁 Visit #2 (folder name is displayed in the app)
     ...

```
The active visit can be changed from the top left corder dropdown. Once a study has been loaded, additional files and folders dropped onto the file drop area are added as new visits.

## External libraries and resources

Development of this sapplication would not have been possible without numerous open source Javascript libraries and the tremendous contributions of their developers. The most important external libraries used in this project are:
- [Vue.js](https://vuejs.org)
- [Cornerstone.js](https://cornerstonejs.org/) and its submodules
  - CornerstoneMath
  - CornerstoneTools
  - DicomParser
  - WADOImageLoader
- [Hammer.js](https://hammerjs.github.io/) (as a dependency of Cornerstone.js)

[FontAwesome](https://fontawesome.com/) 5 Pro SVG icons are used extensively in the application. Compiling the application from source is currently not possible without a compatible license. FontAwesome icons © Fonticons, Inc.

## License (excluding FontAwesome icons)

Copyright (c) 2021-2022 Sampsa Lohi & University of Eastern Finland & University of Eastern Finland

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
