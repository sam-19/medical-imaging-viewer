/** MEDICAL IMAGING VIEWER VISIT LOADER
 * Loads multiple visits from the given resource.
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { FileSystemItem, VisitLoader } from '../../types/common'
import { PatientVisit } from '../../types/common'
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import DicomImage from '../dicom/DicomImage'
import DicomWaveform from '../dicom/DicomWaveform'
import GenericStudyLoader from './GenericStudyLoader'
import EdfSignal from '../edf/EdfEegRecord'

class GenericVisitLoader implements VisitLoader {
    /**
     * Load visits from the given file system item.
     * @param fsItem FileSystemItem
     */
    public async loadFromFsItem (fsItem: FileSystemItem, config?: any): Promise<PatientVisit[]> {
        const studyLoader = new GenericStudyLoader()
        return studyLoader.loadFromFsItem(fsItem, config).then(async visits => {
            let visitCounter = 1
            const loadedVisits = [] as PatientVisit[]
            for (const { title, date, studies } of visits) {
                // Don't add empty visits
                if (!studies.length) {
                    console.warn(`Imported visit ${title} did not have any valid imaging studies, the visit was not added.`)
                    continue
                }
                const visit = {
                    title: title || '',
                    counter: title ? 0 : visitCounter,
                    date: date || '',
                    studies: { eeg: [], ekg: [], radiology: [] },
                } as any
                let topoImages = [] as DicomImage[]
                let hasAnyRecord = false // Check that there is at least one actual record in the visit
                for (const study of studies) {
                    const types = study.type.split(':')
                    if (study.scope === 'radiology') {
                        if (types[0] === 'image') {
                            if (study.format === 'dicom') {
                                // Data element should always be a loaded file
                                const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(study.data)
                                if (imageId) {
                                    if (types.length === 1) {
                                        // Add a single image
                                        (visit.studies.radiology as DicomImage[]).push(
                                            new DicomImage(
                                                study.meta.modality, study.name, study.data.size, study.type, imageId
                                            )
                                        )
                                        hasAnyRecord = true
                                    } else if (types[1] === 'series') {
                                        // Add an image stack
                                        const imgStack = new DicomImage(
                                            study.meta.modality, study.name, study.files.length, study.type, ''
                                        )
                                        ;(visit.studies.radiology as DicomImage[]).push(imgStack)
                                        const resourceIdx = visit.studies.radiology.length - 1
                                        // Add all loaded files
                                        for (let i=0; i<study.files.length; i++) {
                                            const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(study.files[i])
                                            if (imageId) {
                                                imgStack.push(
                                                    new DicomImage(
                                                        study.meta.modality,
                                                        study.files[i].name,
                                                        study.files[i].size,
                                                        study.type.split(':')[0],
                                                        imageId
                                                    )
                                                )
                                            }
                                        }
                                        // Add URLs that haven't been loaded yet
                                        for (let i=0; i<study.urls.length; i++) {
                                            if (imageId) {
                                                imgStack.push(
                                                    new DicomImage(
                                                        study.meta.modality,
                                                        `${study.name}-${i}`,
                                                        0,
                                                        study.type.split(':')[0],
                                                        `wadouri:${study.urls[i]}`
                                                    )
                                                )
                                            }
                                        }
                                        // Don't add an empty image stack (WADOImageLoader may have failed adding local files)
                                        if (!imgStack.length) {
                                            visit.studies.radiology.splice(resourceIdx, 1)
                                            console.warn(`Imported study ${visit.studies.radiology[resourceIdx]} did not have any valid images, the study was not added.`)
                                        } else {
                                            // Set "middle" image as cover image
                                            const coverIdx = Math.floor(imgStack.length/2)
                                            await imgStack.setCoverImage(coverIdx)
                                            hasAnyRecord = true
                                        }
                                    } else if (types[1] === 'topogram') {
                                        // Add as a topogram image
                                        const topo = new DicomImage(
                                            study.meta.modality, study.name, study.data.size, study.type, imageId
                                        )
                                        await topo.preloadAndCacheImage()
                                        topoImages.push(topo)
                                    } else {
                                        // Some other image
                                        hasAnyRecord = true
                                    }
                                }
                            }
                        }
                    } else if (study.scope === 'ekg') {
                        // Add EKG record
                        visit.studies.ekg.push(new DicomWaveform(study.name, study.data))
                        hasAnyRecord = true
                    } else if (study.format === 'edf') {
                        // Pass the EDF data to EdfSignal class to determine record type
                        const record = new EdfSignal(study.name, study.data, study.meta.loader)
                        if (record.type === 'eeg') {
                            // Load default setup
                            record.addSetup('default:10-20')
                            record.addMontage('10-20:raw', "10-20: As recorded", "default:10-20:raw")
                            record.addMontage('10-20:avg', "10-20: Average reference", "default:10-20:avg")
                            record.addMontage('10-20:dbn', "10-20: Double banana", "default:10-20:dbn")
                            record.addMontage('10-20:lpl', "10-20: Laplacian", "default:10-20:lpl")
                            record.addMontage('10-20:trv', "10-20: Transverse", "default:10-20:trv")
                            // Add EEG record
                            visit.studies.eeg.push(record)
                            hasAnyRecord = true
                        }
                    }
                }
                // Attach possible topogram image to all applicable stacks
                if (topoImages.length) {
                    for (const resource of visit.studies.radiology) {
                        for (const topo of topoImages) {
                            // Match correct topogram by modality and study ID
                            if (resource.isStack &&
                                topo.modality === resource.modality &&
                                topo.studyID === resource.coverImage.studyID
                            ) {
                                resource.topogram = topo
                                break
                            }
                        }
                    }
                }
                if (visit && hasAnyRecord) {
                    loadedVisits.push(visit)
                    visitCounter++
                } else {
                    console.warn(`Imported visit ${title} did not have any valid imaging studies, the visit was not added.`)
                }
            }
            console.log(loadedVisits)
            return loadedVisits
        })
    }
}
export default GenericVisitLoader
