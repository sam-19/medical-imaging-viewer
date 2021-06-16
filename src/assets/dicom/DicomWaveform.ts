/** MEDICAL IMAGING VIEWER DICOM WAVEFORM
 * Class for handling DICOM waveforms (mostly biosignals).
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import { BiosignalAnnotation } from '../../types/common'
import { DicomEkgChannel, DicomEkgResource } from '../../types/ekg'

class DicomWaveform implements DicomEkgResource {
    protected _active: boolean = false
    protected _annotations: BiosignalAnnotation[] = []
    protected _channels: DicomEkgChannel[] = []
    protected _samples: number = 0
    protected _id: string
    protected _name: string
    protected _maxSamplingRate: number = 0
    protected _type: string = 'unknown'
    protected _url: string = ''

    constructor (name: string, data?: object) {
        // Generate a pseudo-random identifier for this object
        this._id = Math.random().toString(36).substr(2, 8)
        this._name = name
        if (data) {
            this.extractSignalsFromDicomData(data)
        }
    }
    // Getters and setters
    get annotations () {
        return this._annotations
    }
    get channels () {
        return this._channels
    }
    get duration () {
        return this.sampleCount/this.maxSamplingRate
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
    get maxSamplingRate () {
        return this._maxSamplingRate
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
    // Methods
    extractSignalsFromDicomData (dataSet: any) {
        const rootEls = dataSet.elements
        // Waveform sequence is stored in the 0x5400,0x0100 tag
        if (!rootEls.hasOwnProperty('x54000100')) {
            console.error("Provided DICOM dataset did not contain a waveform sequence!")
            return
        }
        if (!rootEls.x54000100.items) {
            console.error("Provided DICOM dataset did not contain any waveform data items!")
            return
        }
        // Allocated bits
        const ba = rootEls.x54000100.items[0].dataSet.uint16('x54001004')
        if (ba !== 16) {
            console.error(`Provided DICOM dataset has incompatible bit allocation (${ba} bits per sample)!`)
            return
        }
        // Sample interpretation (essentially sample data property type)
        const si = rootEls.x54000100.items[0].dataSet.string('x54001006')
        if (si !== 'SS') {
            console.error(`Provided DICOM dataset has incompatible sample interpretation (${si})!`)
            return
        }
        // Number of channels (uint)
        const numChans = rootEls.x54000100.items[0].dataSet.uint16('x003a0005')
        // Number of samples (uint)
        this._samples = rootEls.x54000100.items[0].dataSet.uint16('x003a0010')
        // Sampling frequency (number string)
        this._maxSamplingRate = parseFloat(rootEls.x54000100.items[0].dataSet.string('x003a001a'))
        if (!rootEls.x54000100.items[0].dataSet.elements || !rootEls.x54000100.items[0].dataSet.elements.x003a0200
            || !rootEls.x54000100.items[0].dataSet.elements.x003a0200.items
        ) {
            console.error('Provided DICOM dataset did not contain any valid channel definitions!')
            return
        }
        // Save possible annotations
        if (rootEls.x0040b020.items) {
            for (const annotation of rootEls.x0040b020.items) {
                for (const annotation of rootEls.x0040b020.items) {
                    const annChans = annotation.dataSet?.uint16('x0040a0b0')
                    const annText = annotation.dataSet?.string('x00700006')
                    const annCode = annotation.dataSet?.elements?.x0040a043?.dataSet?.string('x00080100')
                    const rangeType = annotation.dataSet?.string('x0040a130')
                    const samplePos = annotation.dataSet?.string('x0040a132')
                    const timeOffset = annotation.dataSet?.string('x0040a138')
                    const dateTime = annotation.dataSet?.string('x0040a13a')
                }
            }
        }
        // Then the actual waveform data
        if (!rootEls.x54000100.items[0] || !rootEls.x54000100.items[0].dataSet.elements
            || !rootEls.x54000100.items[0].dataSet.elements.x54001010
        ) {
            console.error('Provided DICOM dataset did not contain waveform data!')
            return
        }
        const wfData = rootEls.x54000100.items[0].dataSet
        // Get channel properties
        const wfArray = rootEls.x54000100.items[0].dataSet.byteArray.slice(
            wfData.elements.x54001010.dataOffset,
            wfData.elements.x54001010.dataOffset + wfData.elements.x54001010.length
        )
        for (let i=0; i<rootEls.x54000100.items[0].dataSet.elements.x003a0200.items.length; i++) {
            const chanItem = rootEls.x54000100.items[0].dataSet.elements.x003a0200.items[i].dataSet
            const altLabel = chanItem.elements.x003a0208.items[0].dataSet.string('x00080104')
            const chanData = {
                label: chanItem.string('x003a0203') || altLabel || '??',
                samplingRate: this._maxSamplingRate,
                signal: [] as number[],
                sensitivity: parseFloat(chanItem.string('x003a0210')),
                sensitivityCF: parseFloat(chanItem.string('x003a0212')), // Sensitivity correction factor
                //waveformPadding: chanItem.string(wpTag),
                baseline: parseFloat(chanItem.string('x003a0213')),
                timeSkew: parseFloat(chanItem.string('x003a0214')),
                filterLow: parseFloat(chanItem.string('x003a0220')),
                filterHigh: parseFloat(chanItem.string('x003a0221')),
                filterNotch: parseFloat(chanItem.string('x003a0222')),
            }
            // There is also channel sensitivity unit sequence (x003a0211) and waveform padding (x5400100A),
            // but I'm not sure if these are really needed
            // Unit Sequence: https://dicom.innolitics.com/ciods/ambulatory-ecg/waveform/54000100/003a0200/003a0211
            // Waveform padding: https://dicom.innolitics.com/ciods/ambulatory-ecg/waveform/54000100/5400100a
            // Read signal data
            for (let j=0; j<this._samples; j++) {
                if (j*numChans + i >= wfArray.length/2) {
                    break
                }
                const offset = j*numChans + i
                chanData.signal.push(chanItem.byteArrayParser.readInt16(wfArray, offset*2))
            }
            this.channels.push(chanData)
        }
    }
    /**
     * Get datapoint value with all adjustments applied.
     * @param number channel index
     * @param number datapoint index
     */
    getAdjustedSignalValue (channel: number, datapoint: number): number | undefined {
        if (channel >= this.channels.length
            || datapoint >= this.channels[channel].signal.length
        ) {
            return undefined
        }
        // Apply required corrections
        let sigVal = this.channels[channel].signal[datapoint]
        // According to my sources the baseline correction is really
        // applied before the sensitivity corrections
        sigVal += this.channels[channel].baseline || 0 // For cases when the value is undefined
        sigVal *= this.channels[channel].sensitivity || 1
        sigVal *= this.channels[channel].sensitivityCF || 1
        return sigVal
    }
}
export default DicomWaveform
export { DicomEkgResource }
