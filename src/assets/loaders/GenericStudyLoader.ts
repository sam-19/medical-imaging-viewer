/** MEDIGI VIEWER STUDY LOADER
 * Checks the types of given studies and laod them accordingly.
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import dicomParser from 'dicom-parser'
import * as edfdecoder from 'edfdecoder'
import { FileSystemItem, StudyLoader, StudyObject } from '../../types/common'
const CONFIG_FILE_NAME = 'medigi_study_config.json'

interface StudyDict {
    title: string,
    date?: string,
    studies: StudyObject[],
}

class GenericStudyLoader implements StudyLoader {
    private getStudyObjectTemplate (): StudyObject {
        return {
            data: null,
            files: [] as File[],
            format: '',
            meta: {},
            name: '',
            scope: '',
            type: '',
            urls: [] as string[],
            version: '1.0'
        }
    }
    /**
     * Load study properties from a single file.
     * @param file
     * @param name optional default study name.
     * @param config optional study configuration.
     * @return a promise containing the loaded study as StudyObject.
     */
    public async loadFromFile (file: File, config?: any): Promise<StudyObject> {
        let study = this.getStudyObjectTemplate()
        if (config) {
            study = Object.assign(study, config)
        }
        // Preperties that are required of a study object
        const reqProps = ['format', 'meta', 'scope', 'type']
        for (const prop of reqProps) {
            if (prop !== 'meta' && !study[prop as keyof StudyObject]
                || prop === 'meta' && Object.keys(study[prop as keyof StudyObject]).length === 0
            ) {
                // Try to load the file, according to extension
                if (file.name.toLowerCase().endsWith('.edf')) {
                    // EDF Decoder is very handy forf small files, but cannot be used to pipe data from large files
                    if (file.size < 50*1024*1024) {
                        try {
                            const decoder = new (edfdecoder as any).EdfDecoder()
                            decoder.setInput(await file.arrayBuffer())
                            decoder.decode()
                            const edfData = decoder.getOutput()
                            if (!study.format) {
                                // EDF format
                                study.format = 'edf'
                            }
                            // Try to fetch metadata from header
                            // Saving metadata separately is important in case libraries are added or changed later
                            study.meta.patientId = study.meta.patientId || edfData.getPatientID() || null
                            study.meta.recordId = study.meta.recordId || edfData.getRecordingID() || null
                            study.meta.startDate = study.meta.startDate || edfData.getRecordingStartDate() || null
                            study.meta.nRecords = edfData.getNumberOfRecords() || null
                            study.meta.recordLen = edfData.getRecordDuration() || null
                            study.meta.nSignals = edfData.getNumberOfSignals() || null
                            study.data = edfData
                            study.meta.loader = 'edf-decoder'

                        } catch (e) {
                            console.log("EDF ERROR", e)
                            // Not a regular EDF file, perhaps EDF+?
                        }
                    } else {
                        // Need something else for larger files
                    }
                } else if (file.name.toLowerCase().endsWith('.pdf')) {
                    // TODO: Implement PDF loader
                } else if (file.name.toLowerCase().endsWith('.txt')) {
                    // TODO: Implement text file loader (reports)
                } else if (file.name.toLowerCase().endsWith('.zip')) {
                    // Zip files would be tricky. They would first have to be decompressed
                    // and then passed through this again.
                }  else if (file.name.toLowerCase().endsWith('.jpg') ||
                            file.name.toLowerCase().endsWith('.jpeg') ||
                            file.name.toLowerCase().endsWith('.png') ||
                            file.name.toLowerCase().endsWith('.gif')
                ) {
                    // TODO: Implement image file loaders?
                } else {
                    // DICOM files may not have any extension, try DICOM first
                    try {
                        const byteArray = new Uint8Array(await file.arrayBuffer())
                        const dataSet = dicomParser.parseDicom(byteArray)
                        if (!study.format) {
                            // DICOM format
                            study.format = 'dicom'
                        }
                        if (!study.meta.instanceId) {
                            // Save study instance UID
                            study.meta.instanceId = dataSet.string('x0020000d') || ''
                        }
                        if (!study.meta.modality) {
                            study.meta.modality = (dataSet.string('x00080060') || '').toUpperCase()
                        }
                        // First try if this is a DICOM image file
                        const imageType = dataSet.string('x00080008')
                        if (imageType !== undefined) {
                            // This is a radiological image
                            if (!study.scope) {
                                study.scope = 'radiology'
                            }
                            // Use the file as data object for WADOImageLoader
                            study.data = file
                            if (!study.type) {
                                const typeParts = imageType.split('\\')
                                // Part 3 defines a possible localizer (topogram) image
                                if (typeParts[2].toLowerCase() === 'localizer') {
                                    study.type = 'image:topogram'
                                } else {
                                    study.type = 'image'
                                }
                            }
                            // Add possible related study instances
                            if (dataSet.elements.x00081140 && dataSet.elements.x00081140.items) {
                                for (const relItem of dataSet.elements.x00081140.items) {
                                    if (relItem.dataSet) {
                                        if (!study.meta.relatedStudies) {
                                            study.meta.relatedStudies = []
                                        }
                                        study.meta.relatedStudies.push(relItem.dataSet.string('x00081150'))
                                    }
                                }
                            }
                        } else if (dataSet.elements.x54000100) {
                            // This is a waveform sequence
                            if (study.meta.modality === 'ECG') {
                                if (!study.scope) {
                                    study.scope = 'ekg'
                                }
                                if (!study.type) {
                                    study.type = dataSet.string('x00081030') || ''
                                }
                                // Use the parsed dataset as data object
                                study.data = dataSet
                            }
                        } else if (dataSet.elements.x00420011) {
                            // This is an encapsulated document
                            if (!study.scope) {
                                study.scope = 'document'
                            }
                            if (!study.name) {
                                study.name = dataSet.string('x00420010') || ''
                            }
                            if (!study.meta.mime) {
                                study.meta.mime = dataSet.string('x00420012') || ''
                            }
                            // Document data can be retrieved from x00420011
                            // study.data = dataSet.string('x00420011')
                        }
                    } catch (e) {
                        if (typeof e === 'string' && (e as string).indexOf('DICM prefix not found') >= 0) {
                            // This was not a DICOM file, try something else
                        } else {
                            console.error(e)
                        }
                    }
                }
            }
        }
        if (!study.name) {
            // Use file name as default
            study.name = file.name
        }
        return study
    }
    /**
     * Recurse a given FileSystemItem and load each contained study.
     * @param fileTree FileSystemItem generated by one of the file loaders.
     * @param config optional configuration detailing the contained studies.
     * @return a promise containing the loaded studies as { title: string, date?: string, studies: StudyObject[] }
     */
    public async loadFromFileSystem (fileTree: FileSystemItem, config: any = {}): Promise<StudyDict[]> {
        if (!fileTree) {
            return []
        }
        const visits = []
        let rootDir = fileTree
        while (!rootDir.files.length && rootDir.directories.length === 1) {
            // Recurse until we arrive at the root folder of the image sets
            rootDir = rootDir.directories[0]
        }
        // Check for possible config file in the root directory
        if (rootDir.files.length) {
            for (let i=0; i<rootDir.files.length; i++) {
                if (rootDir.files[i].name === CONFIG_FILE_NAME) {
                    // Remove the config file from the directory
                    const confFile = rootDir.files.splice(i, 1)[0]
                    // Attempt to read config from the file
                    await new Promise((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onloadend = (e: any) => {
                            const result = JSON.parse(e.target.result)
                            resolve(result)
                        }
                        reader.onerror = (e: any) => {
                            reject(e)
                        }
                        config = reader.readAsText(confFile.file as File)
                    }).then(json => {
                        config = Object.assign(json, config)
                    }).catch(e => {
                        console.error(`Could not load config from ${confFile.path}:`)
                        console.error(e.message)
                    })
                    break
                }
            }
        }
        // Make sure there is a visits and studies property on config
        if (!config.hasOwnProperty('visits')) {
            config.visits = {}
        }
        if (!config.hasOwnProperty('studies')) {
            config.studies = {}
        }
        const studyName = rootDir.name
        // Next, check if this is a single file dir or several dirs
        if (!rootDir.directories.length && rootDir.files.length) {
            const studies = []
            if (!rootDir.path) {
                // If this is the "pseudo" root directory, add each file as a separate study
                // (as they were dragged as separate files into the viewer)
                for (let i=0; i<rootDir.files.length; i++) {
                    const curFile = rootDir.files[i]
                    let study
                    if (curFile.file) {
                        study = await this.loadFromFile(
                            (curFile.file as File),
                            Object.assign(
                                { name: curFile.name },
                                // Path > name in specificity
                                config.studies[curFile.name],
                                config.studies[curFile.path]
                            )
                        )
                    } else if (curFile.url) {
                        // Fetch the file from url
                        await fetch(curFile.url)
                        .then(response => response.blob())
                        .then(async (response: any) => {
                            study = await this.loadFromFile(
                                (new File([response], curFile.name)),
                                Object.assign(
                                    { name: curFile.name },
                                    config.studies[curFile.name],
                                    config.studies[curFile.path]
                                )
                            )
                        })
                    }
                    studies.push(study)
                }
            } else {
                // Load the first file and add directory contents as study files and
                // pass the directory name as default study name
                let study
                if (rootDir.files[0].file) {
                    study = await this.loadFromFile(
                        (rootDir.files[0].file as File),
                        Object.assign(
                            { name: rootDir.name },
                            config.studies[rootDir.name],
                            config.studies[rootDir.path]
                        )
                    )
                } else if (rootDir.files[0].url) {
                    // Fetch the file from url
                    await fetch(rootDir.files[0].url)
                    .then(response => response.blob())
                    .then(async (response: any) => {
                        study = await this.loadFromFile(
                            (new File([response], rootDir.files[0].name)),
                            Object.assign(
                                { name: rootDir.name },
                                config.studies[rootDir.name],
                                config.studies[rootDir.path]
                            )
                        )
                    })
                }
                if (study) {
                    for (let i=0; i<rootDir.files.length; i++) {
                        if (rootDir.files[i].file) {
                            study.files.push(rootDir.files[i].file as File)
                        } else if (rootDir.files[i].url) {
                            study.urls.push(rootDir.files[i].url as string)
                        }
                    }
                    // Add a series tag if there is more than one file
                    if (study.files.length > 1 || study.urls.length > 1 && !study.type.endsWith(':series')) {
                        study.type += ':series'
                    }
                    studies.push(study)
                }
            }
            visits.push(
                Object.assign(
                    { studies: studies },
                    { title: rootDir.name },
                    config.visits[rootDir.name],
                    config.visits[rootDir.path]
                )
            )
        } else if (rootDir.directories.length) {
            // Check if this directory contains several visits.
            let visitDirs = [rootDir]
            for (let i=0; i<rootDir.directories.length; i++) {
                // Allow single nested directories inside studies as well
                while (!rootDir.directories[i].files.length && rootDir.directories[i].directories.length === 1) {
                    rootDir.directories[i] = rootDir.directories[i].directories[0]
                }
                if (rootDir.directories[i].directories.length) {
                    visitDirs = rootDir.directories
                }
            }
            // Try to add each individual dir as a separate study.
            // First check that each directory really contains only files, skip those that don't.
            for (let visitDir of visitDirs) {
                const studies = [] as StudyObject[]
                for (let i=0; i<visitDir.directories.length; i++) {
                    const curDir = visitDir.directories[i]
                    if (curDir.directories.length) {
                        console.warn(`${curDir.path} was omitted because it contained subdirectories.`)
                        continue
                    } else if (!curDir.files.length) {
                        console.warn(`${curDir.path} was omitted because it was empty.`)
                        continue
                    } else {
                        // Add each directory as separate study
                        const curFile = curDir.files[0]
                        let study
                        if (curFile.file) {
                            study = await this.loadFromFile(
                                (curFile.file as File),
                                Object.assign(
                                    { name: curDir.name },
                                    config.studies[curDir.name],
                                    config.studies[curDir.path]
                                )
                            )
                        } else if (curFile.url) {
                            // Fetch the file from url
                            await fetch(curFile.url)
                            .then(response => response.blob())
                            .then(async (response: any) => {
                                study = await this.loadFromFile(
                                    (new File([response], curFile.name)),
                                    Object.assign(
                                        { name: curDir.name },
                                        config.studies[curDir.name],
                                        config.studies[curDir.path]
                                    )
                                )
                            })
                        }
                        if (study) {
                            for (let j=0; j<curDir.files.length; j++) {
                                if (curDir.files[j].file) {
                                    study.files.push(curDir.files[j].file as File)
                                } else if (curDir.files[j].url) {
                                    study.urls.push(curDir.files[j].url as string)
                                }
                            }
                            if (study.files.length > 1 || study.urls.length > 1 && !study.type.endsWith(':series')) {
                                study.type += ':series'
                            }
                            studies.push(study)
                        }
                    }
                }
                const newVisit = Object.assign(
                    { studies: studies },
                    { title: visitDir.name },
                    config.visits[visitDir.name],
                    config.visits[visitDir.path]
                )
                visits.push(newVisit)
            }
        } else {
            console.warn("Dropped item had an empty root directory!")
        }
        return visits.sort((a, b) => { return (parseInt(a.date) || 0) - (parseInt(b.date) || 0) })
    }
}

export default GenericStudyLoader
