/** MEDIGI VIEWER EDF SIGNAL
 * Class for handling DICOM waveforms (mostly biosignals).
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
 import { SignalResource, SignalChannel } from '../../types/assets'

 class EdfSignal implements SignalResource {
     protected _active: boolean = false
     protected _annotations: any[] = []
     protected _channels: SignalChannel[] = []
     protected _samples: number = 0
     protected _id: string
     protected _name: string
     protected _resolution: number = 0
     protected _type: string = 'unknown'
     protected _url: string = ''

     constructor (name: string, data?: object, loader?: string) {
        // Generate a pseudo-random identifier for this object
        this._id = Math.random().toString(36).substr(2, 8)
        this._name = name
        if (data) {
            this.extractSignalsFromEdfData(data, loader || undefined)
            console.log("data", data)
        }
    }
    // Getters and setters
    get annotations () {
        return this._annotations
    }
    get channels () {
        return this._channels
    }
    get id () {
        return this._id
    }
    get isActive () {
        return this._active
    }
    set isActive (val: boolean) {
        this._active = val
    }
    get name () {
        return this._name
    }
    set name (name: string) {
        this._name = name
    }
    get resolution () {
        return this._resolution
    }
    get sampleCount () {
        return this._samples
    }
    get type () {
        return this._type.split(':')[0]
    }
    set type (type: string) {
        this._type = type
    }
    get url () {
        return this._url
    }
    set url (url: string) {
        this._url = url
    }

    extractSignalsFromEdfData (data: any, loader?: string) {
        // Select method based on file loader
        if (loader === 'edf-decoder') {
            let totalSamplesPerRecord = 0
            // For automatic determination of study modality
            let eegSignalCount = 0
            let polySignalCount = 0
            // We should not have loaded large files with decoder, so cache the whole signal data
            const totalRecords = data.getNumberOfRecords()
            for (let i=0; i<data.getNumberOfSignals(); i++) {
                // Try to determine sensitivity from unit
                const unitLow = data.getSignalPhysicalUnit(i).toLowerCase()
                const sensitivity = unitLow === 'uv' || unitLow === 'µv' ? 1_000_000
                                    : unitLow === 'mv' ? 1000 : unitLow === 'v' ?  1 : 0
                const chanData = {
                    label: data.getSignalLabel(i) || '',
                    resolution: data.getSignalSamplingFrequency(i) || 0,
                    sensitivity: sensitivity,
                    signals: data.getPhysicalSignalConcatRecords(i, 0, totalRecords),
                    unit: data.getSignalPhysicalUnit(i) || '',
                    samplesPerRecord: data.getSignalNumberOfSamplesPerRecord(i) || 0,
                    physicalMin: data.getSignalPhysicalMin(i) || 0,
                    physicalMax: data.getSignalPhysicalMax(i) || 0,
                    filter: data.getSignalPrefiltering(i) || '',
                    transducer: data.getSignalTransducerType(i) || '',
                }
                totalSamplesPerRecord += chanData.samplesPerRecord || 0
                if (chanData.label.toLowerCase().indexOf('eeg') !== -1) {
                    eegSignalCount++
                } else if (
                    chanData.label.toLowerCase().indexOf('eog') !== -1 ||
                    chanData.label.toLowerCase().indexOf('loc') !== -1 ||
                    chanData.label.toLowerCase().indexOf('roc') !== -1
                ) {
                    polySignalCount++
                }
                this._channels[i] = chanData
            }
            // No reason to keep the original data
            data = null
        }
    }
}
export default EdfSignal
export { SignalResource }
