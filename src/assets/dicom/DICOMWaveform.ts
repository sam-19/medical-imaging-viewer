/** MEDIGI VIEWER DICOM WAVEFORM
 * Class for handling DICOM waveforms (mostly biosignals).
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import { SignalResource, SignalChannel } from '../../types/assets'
import DicomDataProperty from './DicomDataProperty'

class DicomWaveform implements SignalResource {
    protected _active: boolean = false
    protected _annotations: any[] = []
    protected _channels: SignalChannel[] = []
    protected _samples: number = 0
    protected _id: string
    protected _name: string
    protected _resolution: number = 0
    protected _type: string = 'unknown'
    //protected _url: string

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
    /*
    get url () {
        return this._url
    }
    set url (url: string) {
        this._url = url
    }
    */
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
        const baTag = DicomDataProperty.getPropertyByTagPair(0x5400, 0x1004)?.getTagHex().substring(1)
        const ba = rootEls.x54000100.items[0].dataSet.uint16(baTag)
        if (ba !== 16) {
            console.error(`Provided DICOM dataset has incompatible bit allocation (${ba} bits per sample)!`)
            return
        }
        // Sample interpretation (essentially sample data property type)
        const siTag = DicomDataProperty.getPropertyByTagPair(0x5400, 0x1006)?.getTagHex().substring(1)
        const si = rootEls.x54000100.items[0].dataSet.string(siTag)
        if (si !== 'SS') {
            console.error(`Provided DICOM dataset has incompatible sample interpretation (${si})!`)
            return
        }
        // Number of channels (uint)
        const ncTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x0005)?.getTagHex().substring(1)
        const numChans = rootEls.x54000100.items[0].dataSet.uint16(ncTag)
        // Number of samples (uint)
        const nsTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x0010)?.getTagHex().substring(1)
        this._samples = rootEls.x54000100.items[0].dataSet.uint16(nsTag)
        // Sampling frequency (number string)
        const sfTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x001A)?.getTagHex().substring(1)
        this._resolution = parseFloat(rootEls.x54000100.items[0].dataSet.string(sfTag))
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
        //const wdTag = DicomDataProperty.getPropertyByTagPair(0x5400, 0x1010)?.getTagHex().substring(1)
        const wfData = rootEls.x54000100.items[0].dataSet
        // Waveform padding (not sure if this is needed)
        // See: https://dicom.innolitics.com/ciods/ambulatory-ecg/waveform/54000100/5400100a
        //const wpTag = DicomDataProperty.getPropertyByTagPair(0x5400, 0x100A)?.getTagHex().substring(1)
        // Get channel properties
        // Channel label
        const clTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x0203)?.getTagHex().substring(1)
        // Alternate channel label in my dataset (these need better handling)
        const alTag = DicomDataProperty.getPropertyByTagPair(0x0008, 0x0104)?.getTagHex().substring(1)
        // Channel sensitivity
        const csTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x0210)?.getTagHex().substring(1)
        // Channel sensitivity unit sequence
        const suTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x0211)?.getTagHex().substring(1)
        // Channel sensitivity correction factor
        const scTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x0212)?.getTagHex().substring(1)
        // Channel baseline
        const cbTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x0213)?.getTagHex().substring(1)
        // Channel time skew
        const tsTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x0214)?.getTagHex().substring(1)
        // Channel filter low frequency
        const flTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x0220)?.getTagHex().substring(1)
        // Channel filter high frequency
        const fhTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x0221)?.getTagHex().substring(1)
        // Channel notch filter frequency
        const nfTag = DicomDataProperty.getPropertyByTagPair(0x003A, 0x0222)?.getTagHex().substring(1)
        console.log(dataSet)
        const wfArray = rootEls.x54000100.items[0].dataSet.byteArray.slice(
            wfData.elements.x54001010.dataOffset,
            wfData.elements.x54001010.dataOffset + wfData.elements.x54001010.length
        )
        for (let i=0; i<rootEls.x54000100.items[0].rootEls.x003a0200.items.length; i++) {
            const chanItem = rootEls.x54000100.items[0].rootEls.x003a0200.items[i].dataSet
            const altLabel = chanItem.elements.x003a0208.items[0].dataSet.string(alTag)
            const chanData = {
                label: chanItem.string(clTag) || altLabel || '??',
                resolution: this._resolution,
                signals: [] as number[],
                sensitivity: parseFloat(chanItem.string(csTag)),
                sensitivityCF: parseFloat(chanItem.string(scTag)),
                //waveformPadding: chanItem.string(wpTag),
                baseline: parseFloat(chanItem.string(cbTag)),
                timeSkew: parseFloat(chanItem.string(tsTag)),
                filterLow: parseFloat(chanItem.string(flTag)),
                filterHigh: parseFloat(chanItem.string(fhTag)),
                filterNotch: parseFloat(chanItem.string(nfTag)),
            }
            // Read signal data
            for (let j=0; j<this._samples; j++) {
                if (j*numChans + i >= wfArray.length/2) {
                    break
                }
                const offset = j*numChans + i
                chanData.signals.push(chanItem.byteArrayParser.readInt16(wfArray, offset*2))
            }
            this.channels.push(chanData)
        }
    }

}
export default DicomWaveform
export { SignalResource }
