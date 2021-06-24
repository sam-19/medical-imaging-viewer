/** MEDICAL IMAGING STUDY VIEWER DICOM VALUE REPRESENTATIONS
 * This class contains the standard DICOM Value Representations according to the 2017 standard.
 * See http://dicom.nema.org/medical/Dicom/2017c/output/chtml/part05/sect_6.2.html
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

 /**
  * DICOM Value Representation.
  * @param {string} name in CamelCase.
  * @param {string[]} types list of types applicable for this VR.
  * @param {number|undefined|(number|undefined)[]} length fixed length as a number/undefined; range as a an array [min, max].
  * @param {'b'|'c'} measure length measure as one of: 'b' (byte), 'c' (chars). Optional (default 'b').
  */
class DicomVR {
    readonly name: string
    readonly types: string[]
    private length: number | undefined | (number | undefined)[]
    private measure: 'b'|'c'
    /**
     * Application Entity: A string of characters that identifies an Application Entity
     * with leading and trailing spaces (20H) being non-significant.
     * A value consisting solely of spaces shall not be used.
     */
    static AE: DicomVR
    /**
     * Age String: A string of characters with one of the following formats
     * -- nnnD, nnnW, nnnM, nnnY; where nnn shall contain
     * the number of days for D, weeks for W, months for M, or years for Y.
     */
    static AS: DicomVR
    /**
     * Attribute Tag: Ordered pair of 16-bit unsigned integers that is the value of a Data Element Tag.
     */
    static AT: DicomVR
    /**
     * Code String: A string of characters with leading or trailing spaces (20H) being non-significant.
     */
    static CS: DicomVR
    /**
     * Date: A string of characters of the format YYYYMMDD; where
     * YYYY shall contain year, MM shall contain the month, and DD shall contain the day,
     * interpreted as a date of the Gregorian calendar system.
     */
    static DA: DicomVR
    /**
     * Decimal String: A string of characters representing either a fixed point number or
     * a floating point number. A fixed point number shall contain only the characters 0-9
     * with an optional leading "+" or "-" and an optional "." to mark the decimal point.
     * A floating point number shall be conveyed as defined in ANSI X3.9, with an "E" or "e"
     * to indicate the start of the exponent. Decimal Strings may be padded with leading or trailing spaces.
     * Embedded spaces are not allowed.
     */
    static DS: DicomVR
    /**
     * Date Time: A concatenated date-time character string in the format:
     * YYYYMMDDHHMMSS.FFFFFF&ZZXX
     * The components of this string, from left to right, are
     * YYYY = Year, MM = Month, DD = Day, HH = Hour (range "00" - "23"),
     * MM = Minute (range "00" - "59"), SS = Second (range "00" - "60").
     * FFFFFF = Fractional Second contains a fractional part of a second as small as 1 millionth of a second
     * (range "000000" - "999999").
     * &ZZXX is an optional suffix for offset from Coordinated Universal Time (UTC),
     * where & = "+" or "-", and ZZ = Hours and XX = Minutes of offset.
     * The year, month, and day shall be interpreted as a date of the Gregorian calendar system.
     * A 24-hour clock is used. Midnight shall be represented by only "0000".
     */
    static DT: DicomVR
    /**
     * FLoating Point Single: Single precision binary floating point number represented in
     * IEEE 754:1985 32-bit Floating Point Number Format.
     */
    static FL: DicomVR
    /**
     * Floating Point Double: Double precision binary floating point number represented in
     * IEEE 754:1985 64-bit Floating Point Number Format.
     */
    static FD: DicomVR
    /**
     * Integer String: A string of characters representing an Integer in base-10 (decimal),
     * shall contain only the characters 0 - 9, with an optional leading "+" or "-".
     * It may be padded with leading and/or trailing spaces. Embedded spaces are not allowed.
     */
    static IS: DicomVR
    /**
     * Long String: A character string that may be padded with leading and/or trailing spaces.
     * The character code 5CH (the BACKSLASH "\" in ISO-IR 6) shall not be present, as it is used
     * as the delimiter between values in multiple valued data elements.
     * The string shall not have Control Characters except for ESC.
     */
    static LO: DicomVR
    /**
     * Long Text: A character string that may contain one or more paragraphs. It may contain
     * the Graphic Character set and the Control Characters, CR, LF, FF, and ESC.
     * It may be padded with trailing spaces, which may be ignored, but leading spaces are considered
     * to be significant. Data Elements with this VR shall not be multi-valued and therefore character code
     * 5CH (the BACKSLASH "\" in ISO-IR 6) may be used.
     */
    static LT: DicomVR
    /**
     * Other Byte String: A string of bytes where the encoding of the contents is specified by
     * the negotiated Transfer Syntax. OB is a VR that is insensitive to Little/Big Endian byte ordering.
     * The string of bytes shall be padded with a single trailing NULL byte value (00H) when necessary
     * to achieve even length.
     */
    static OB: DicomVR
    /**
     * Other Double String: A string of 64-bit IEEE 754:1985 floating point words. OD is a VR that requires
     * byte swapping within each 64-bit word when changing between Little Endian and Big Endian byte ordering.
     */
    static OD: DicomVR
    /**
     * Other Float String: A string of 32-bit IEEE 754:1985 floating point words. OF is a VR that requires
     * byte swapping within each 32-bit word when changing between Little Endian and Big Endian byte ordering.
     */
    static OF: DicomVR
    /**
     * Other Word String: A string of 16-bit words where the encoding of the contents is specified by the
     * negotiated Transfer Syntax. OW is a VR that requires byte swapping within each word when changing
     * between Little Endian and Big Endian byte ordering.
     */
    static OL: DicomVR
    /**
     * A stream of 32-bit words where the encoding of the contents is specified by the negotiated Transfer
     * Syntax. OL is a VR that requires byte swapping within each word when changing byte ordering.
     */
    static OW: DicomVR
    /**
     * Person Name: A character string encoded using a 5 component convention. The character code 5CH
     * (the BACKSLASH "\" in ISO-IR 6) shall not be present, as it is used as the delimiter between values
     * in multiple valued data elements. The string may be padded with trailing spaces. For human use,
     * the five components in their order of occurrence are:
     * family name complex, given name complex, middle name, name prefix, name suffix.
     * Leading and trailing spaces are allowed and considered insignificant.
     * Any of the five components may be an empty string. The component delimiter shall be the caret "^"
     * character (5EH). Delimiters are required for interior null components.
     * Each of the 5 components has a maximum length of 64 bytes.
     */
    static PN: DicomVR
    /**
     * Short String: A character string that may be padded with leading and/or trailing spaces.
     * The character code 05CH (the BACKSLASH "\" in ISO-IR 6) shall not be present, as it is used as
     * the delimiter between values for multiple data elements.
     * The string shall not have Control Characters except ESC.
     */
    static SH: DicomVR
    /**
     * Signed Long: Signed binary integer 32 bits long in 2's complement form.
     */
    static SL: DicomVR
    /**
     * Sequence of Items: Value is a Sequence of zero or more Items.
     */
    static SQ: DicomVR
    /**
     * Signed Short: Signed binary integer 16 bits long in 2's complement form.
     */
    static SS: DicomVR
    /**
     * Short Text: A character string that may contain one or more paragraphs.
     * It may contain the Graphic Character set and the Control Characters, CR, LF, FF, and ESC.
     * It may be padded with trailing spaces, which may be ignored, but leading spaces are
     * considered to be significant. Data Elements with this VR shall not be multi-valued
     * and therefore character code 5CH (the BACKSLASH "\" in ISO-IR 6) may be used.
     */
    static ST: DicomVR
    /**
     * Time: A string of characters of the format HHMMSS.FFFFFF; where
     * HH contains hours (range "00" - "23"),
     * MM contains minutes (range "00" - "59"),
     * SS contains seconds (range "00" - "60"), and
     * FFFFFF contains a fractional part of a second as small as 1 millionth of a second
     * (range "000000" - "999999").
     * A 24-hour clock is used. Midnight shall be represented by only "0000".
     * The string may be padded with trailing spaces. Leading and embedded spaces are not allowed.
     * One or more of the components MM, SS, or FFFFFF may be unspecified as long as every
     * component to the right of an unspecified component is also unspecified, which indicates
     * that the value is not precise to the precision of those unspecified components.
     * The FFFFFF component, if present, shall contain 1 to 6 digits. If FFFFFF is unspecified
     * the preceding "." shall not be included.
     */
    static TM: DicomVR
    /**
     * Unlimited Characters: A character string that may be of unlimited length that may be padded
     * with trailing spaces. The character code 5CH (the BACKSLASH "\" in ISO-IR 6) shall not be
     * present, as it is used as the delimiter between values in multiple valued data elements.
     * The string shall not have Control Characters except for ESC.
     */
    static UC: DicomVR
    /**
     * Unique Identifier: A character string containing a UID that is used to uniquely identify
     * a wide variety of items. The UID is a series of numeric components separated by the period
     * "." character. If a Value Field containing one or more UIDs is an odd number of bytes
     * in length, the Value Field shall be padded with a single trailing NULL (00H) character
     * to ensure that the Value Field is an even number of bytes in length.
     */
    static UI: DicomVR
    /**
     * Unsigned Long: Unsigned binary integer 32 bits long.
     */
    static UL: DicomVR
    /**
     * Unknown: A string of bytes where the encoding of the contents is unknown.
     */
    static UN: DicomVR
    /**
     * URI/URL: A string of characters that identifies a URI or a URL as defined in [RFC3986].
     * Leading spaces are not allowed. Trailing spaces shall be ignored. Data Elements with this VR
     * shall not be multi-valued.
     */
    static UR: DicomVR
    /**
     * Unsigned Short: Unsigned binary integer 16 bits long.
     */
    static US: DicomVR
    /**
     * Unlimited Text: A character string that may contain one or more paragraphs. It may contain
     * the Graphic Character set and the Control Characters, CR, LF, FF, and ESC. It may be padded
     * with trailing spaces, which may be ignored, but leading spaces are considered to be significant.
     * Data Elements with this VR shall not be multi-valued and therefore character code 5CH
     * (the BACKSLASH "\" in ISO-IR 6) may be used.
     */
    static UT: DicomVR

    constructor (name: string, types: string[], length: number | undefined | (number | undefined)[], measure: 'b'|'c' = 'b') {
        this.name = name
        this.types = types
        this.length = length
        this.measure = measure
    }
}
/**
 * DICOM Tag value representations, in format:
 * { name: string, types: array, length: number (in bytes) or array [min: number, max: number] }
 */
DicomVR.AE = new DicomVR('ApplicationEntity', [typeof String], [,16])
DicomVR.AS = new DicomVR('AgeString', [typeof String], 4)
DicomVR.AT = new DicomVR('AttribeTag', [typeof Array, typeof Number], 4)
DicomVR.CS = new DicomVR('CodeString', [typeof String], [,16])
DicomVR.DA = new DicomVR('Date', [typeof String], 8)
DicomVR.DS = new DicomVR('DecimalString', [typeof String], [,16])
DicomVR.DT = new DicomVR('DateTime', [typeof String], [,26])
DicomVR.FL = new DicomVR('FloatingPointSingle', [typeof Number], 4)
DicomVR.FD = new DicomVR('FloatingPointDouble', [typeof Number], 8)
DicomVR.IS = new DicomVR('IntegerString', [typeof String], [,12])
DicomVR.LO = new DicomVR('LongString', [typeof String], [,64], 'c')
DicomVR.LT = new DicomVR('LongText', [typeof String], [,10240], 'c')
DicomVR.OB = new DicomVR('OtherByteString', [typeof Blob], undefined)
DicomVR.OD = new DicomVR('OtherDoubleString', [typeof Blob], [,2**32-8])
DicomVR.OF = new DicomVR('OtherFloatString', [typeof Blob], [,2**32-4])
DicomVR.OL = new DicomVR('OtherLong', [typeof Blob], undefined)
DicomVR.OW = new DicomVR('OtherWordString', [typeof Blob], undefined)
DicomVR.PN = new DicomVR('PersonName', [typeof String], [,5*64+4], 'c')
DicomVR.SH = new DicomVR('ShortString', [typeof String], [,16], 'c')
DicomVR.SL = new DicomVR('SignedLong', [typeof Number], 4)
DicomVR.SQ = new DicomVR('SequenceOfItems', [typeof Blob], undefined)
DicomVR.SS = new DicomVR('SignedShort', [typeof Number], 2)
DicomVR.ST = new DicomVR('ShortText', [typeof String], [,1024], 'c')
DicomVR.TM = new DicomVR('Time', [typeof String], [,14])
DicomVR.UC = new DicomVR('UnlimitedCharacters', [typeof String], [,2**32-2])
DicomVR.UI = new DicomVR('UniqueIdentifier', [typeof String], [,64])
DicomVR.UL = new DicomVR('UnsignedLong', [typeof Number], 4)
DicomVR.UN = new DicomVR('Unknown', [typeof Blob], undefined)
DicomVR.UR = new DicomVR('URI/URL', [typeof String], 2**32-2)
DicomVR.US = new DicomVR('UnsignedShort', [typeof Number], 2)
DicomVR.UT = new DicomVR('UnlimitedText', [typeof String], [,2**32-2])

export default DicomVR
