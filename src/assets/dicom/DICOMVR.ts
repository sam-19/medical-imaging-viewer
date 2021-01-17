/** MEDIGI VIEWER DICOM VALUE REPRESENTATIONS
 * This class contains the standard DICOM Value Representations according to the 2017 standard.
 * See http://dicom.nema.org/medical/Dicom/2017c/output/chtml/part05/sect_6.2.html
 * @package    medigi-viewer
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
class DICOMVR {
    readonly name: string
    readonly types: string[]
    private length: number | undefined | (number | undefined)[]
    private measure: 'b'|'c'
    /**
     * Application Entity: A string of characters that identifies an Application Entity
     * with leading and trailing spaces (20H) being non-significant.
     * A value consisting solely of spaces shall not be used.
     */
    static AE: DICOMVR
    /**
     * Age String: A string of characters with one of the following formats
     * -- nnnD, nnnW, nnnM, nnnY; where nnn shall contain
     * the number of days for D, weeks for W, months for M, or years for Y.
     */
    static AS: DICOMVR
    /**
     * Attribute Tag: Ordered pair of 16-bit unsigned integers that is the value of a Data Element Tag.
     */
    static AT: DICOMVR
    /**
     * Code String: A string of characters with leading or trailing spaces (20H) being non-significant.
     */
    static CS: DICOMVR
    /**
     * Date: A string of characters of the format YYYYMMDD; where
     * YYYY shall contain year, MM shall contain the month, and DD shall contain the day,
     * interpreted as a date of the Gregorian calendar system.
     */
    static DA: DICOMVR
    /**
     * Decimal String: A string of characters representing either a fixed point number or
     * a floating point number. A fixed point number shall contain only the characters 0-9
     * with an optional leading "+" or "-" and an optional "." to mark the decimal point.
     * A floating point number shall be conveyed as defined in ANSI X3.9, with an "E" or "e"
     * to indicate the start of the exponent. Decimal Strings may be padded with leading or trailing spaces.
     * Embedded spaces are not allowed.
     */
    static DS: DICOMVR
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
    static DT: DICOMVR
    /**
     * FLoating Point Single: Single precision binary floating point number represented in
     * IEEE 754:1985 32-bit Floating Point Number Format.
     */
    static FL: DICOMVR
    /**
     * Floating Point Double: Double precision binary floating point number represented in
     * IEEE 754:1985 64-bit Floating Point Number Format.
     */
    static FD: DICOMVR
    /**
     * Integer String: A string of characters representing an Integer in base-10 (decimal),
     * shall contain only the characters 0 - 9, with an optional leading "+" or "-".
     * It may be padded with leading and/or trailing spaces. Embedded spaces are not allowed.
     */
    static IS: DICOMVR
    /**
     * Long String: A character string that may be padded with leading and/or trailing spaces.
     * The character code 5CH (the BACKSLASH "\" in ISO-IR 6) shall not be present, as it is used
     * as the delimiter between values in multiple valued data elements.
     * The string shall not have Control Characters except for ESC.
     */
    static LO: DICOMVR
    /**
     * Long Text: A character string that may contain one or more paragraphs. It may contain
     * the Graphic Character set and the Control Characters, CR, LF, FF, and ESC.
     * It may be padded with trailing spaces, which may be ignored, but leading spaces are considered
     * to be significant. Data Elements with this VR shall not be multi-valued and therefore character code
     * 5CH (the BACKSLASH "\" in ISO-IR 6) may be used.
     */
    static LT: DICOMVR
    /**
     * Other Byte String: A string of bytes where the encoding of the contents is specified by
     * the negotiated Transfer Syntax. OB is a VR that is insensitive to Little/Big Endian byte ordering.
     * The string of bytes shall be padded with a single trailing NULL byte value (00H) when necessary
     * to achieve even length.
     */
    static OB: DICOMVR
    /**
     * Other Double String: A string of 64-bit IEEE 754:1985 floating point words. OD is a VR that requires
     * byte swapping within each 64-bit word when changing between Little Endian and Big Endian byte ordering.
     */
    static OD: DICOMVR
    /**
     * Other Float String: A string of 32-bit IEEE 754:1985 floating point words. OF is a VR that requires
     * byte swapping within each 32-bit word when changing between Little Endian and Big Endian byte ordering.
     */
    static OF: DICOMVR
    /**
     * Other Word String: A string of 16-bit words where the encoding of the contents is specified by the
     * negotiated Transfer Syntax. OW is a VR that requires byte swapping within each word when changing
     * between Little Endian and Big Endian byte ordering.
     */
    static OL: DICOMVR
    /**
     * A stream of 32-bit words where the encoding of the contents is specified by the negotiated Transfer
     * Syntax. OL is a VR that requires byte swapping within each word when changing byte ordering.
     */
    static OW: DICOMVR
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
    static PN: DICOMVR
    /**
     * Short String: A character string that may be padded with leading and/or trailing spaces.
     * The character code 05CH (the BACKSLASH "\" in ISO-IR 6) shall not be present, as it is used as
     * the delimiter between values for multiple data elements.
     * The string shall not have Control Characters except ESC.
     */
    static SH: DICOMVR
    /**
     * Signed Long: Signed binary integer 32 bits long in 2's complement form.
     */
    static SL: DICOMVR
    /**
     * Sequence of Items: Value is a Sequence of zero or more Items.
     */
    static SQ: DICOMVR
    /**
     * Signed Short: Signed binary integer 16 bits long in 2's complement form.
     */
    static SS: DICOMVR
    /**
     * Short Text: A character string that may contain one or more paragraphs.
     * It may contain the Graphic Character set and the Control Characters, CR, LF, FF, and ESC.
     * It may be padded with trailing spaces, which may be ignored, but leading spaces are
     * considered to be significant. Data Elements with this VR shall not be multi-valued
     * and therefore character code 5CH (the BACKSLASH "\" in ISO-IR 6) may be used.
     */
    static ST: DICOMVR
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
    static TM: DICOMVR
    /**
     * Unlimited Characters: A character string that may be of unlimited length that may be padded
     * with trailing spaces. The character code 5CH (the BACKSLASH "\" in ISO-IR 6) shall not be
     * present, as it is used as the delimiter between values in multiple valued data elements.
     * The string shall not have Control Characters except for ESC.
     */
    static UC: DICOMVR
    /**
     * Unique Identifier: A character string containing a UID that is used to uniquely identify
     * a wide variety of items. The UID is a series of numeric components separated by the period
     * "." character. If a Value Field containing one or more UIDs is an odd number of bytes
     * in length, the Value Field shall be padded with a single trailing NULL (00H) character
     * to ensure that the Value Field is an even number of bytes in length.
     */
    static UI: DICOMVR
    /**
     * Unsigned Long: Unsigned binary integer 32 bits long.
     */
    static UL: DICOMVR
    /**
     * Unknown: A string of bytes where the encoding of the contents is unknown.
     */
    static UN: DICOMVR
    /**
     * URI/URL: A string of characters that identifies a URI or a URL as defined in [RFC3986].
     * Leading spaces are not allowed. Trailing spaces shall be ignored. Data Elements with this VR
     * shall not be multi-valued.
     */
    static UR: DICOMVR
    /**
     * Unsigned Short: Unsigned binary integer 16 bits long.
     */
    static US: DICOMVR
    /**
     * Unlimited Text: A character string that may contain one or more paragraphs. It may contain
     * the Graphic Character set and the Control Characters, CR, LF, FF, and ESC. It may be padded
     * with trailing spaces, which may be ignored, but leading spaces are considered to be significant.
     * Data Elements with this VR shall not be multi-valued and therefore character code 5CH
     * (the BACKSLASH "\" in ISO-IR 6) may be used.
     */
    static UT: DICOMVR

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
DICOMVR.AE = new DICOMVR('ApplicationEntity', [typeof String], [,16])
DICOMVR.AS = new DICOMVR('AgeString', [typeof String], 4)
DICOMVR.AT = new DICOMVR('AttribeTag', [typeof Array, typeof Number], 4)
DICOMVR.CS = new DICOMVR('CodeString', [typeof String], [,16])
DICOMVR.DA = new DICOMVR('Date', [typeof String], 8)
DICOMVR.DS = new DICOMVR('DecimalString', [typeof String], [,16])
DICOMVR.DT = new DICOMVR('DateTime', [typeof String], [,26])
DICOMVR.FL = new DICOMVR('FloatingPointSingle', [typeof Number], 4)
DICOMVR.FD = new DICOMVR('FloatingPointDouble', [typeof Number], 8)
DICOMVR.IS = new DICOMVR('IntegerString', [typeof String], [,12])
DICOMVR.LO = new DICOMVR('LongString', [typeof String], [,64], 'c')
DICOMVR.LT = new DICOMVR('LongText', [typeof String], [,10240], 'c')
DICOMVR.OB = new DICOMVR('OtherByteString', [typeof Blob], undefined)
DICOMVR.OD = new DICOMVR('OtherDoubleString', [typeof Blob], [,2**32-8])
DICOMVR.OF = new DICOMVR('OtherFloatString', [typeof Blob], [,2**32-4])
DICOMVR.OL = new DICOMVR('OtherLong', [typeof Blob], undefined)
DICOMVR.OW = new DICOMVR('OtherWordString', [typeof Blob], undefined)
DICOMVR.PN = new DICOMVR('PersonName', [typeof String], [,5*64+4], 'c')
DICOMVR.SH = new DICOMVR('ShortString', [typeof String], [,16], 'c')
DICOMVR.SL = new DICOMVR('SignedLong', [typeof Number], 4)
DICOMVR.SQ = new DICOMVR('SequenceOfItems', [typeof Blob], undefined)
DICOMVR.SS = new DICOMVR('SignedShort', [typeof Number], 2)
DICOMVR.ST = new DICOMVR('ShortText', [typeof String], [,1024], 'c')
DICOMVR.TM = new DICOMVR('Time', [typeof String], [,14])
DICOMVR.UC = new DICOMVR('UnlimitedCharacters', [typeof String], [,2**32-2])
DICOMVR.UI = new DICOMVR('UniqueIdentifier', [typeof String], [,64])
DICOMVR.UL = new DICOMVR('UnsignedLong', [typeof Number], 4)
DICOMVR.UN = new DICOMVR('Unknown', [typeof Blob], undefined)
DICOMVR.UR = new DICOMVR('URI/URL', [typeof String], 2**32-2)
DICOMVR.US = new DICOMVR('UnsignedShort', [typeof Number], 2)
DICOMVR.UT = new DICOMVR('UnlimitedText', [typeof String], [,2**32-2])

export default DICOMVR
