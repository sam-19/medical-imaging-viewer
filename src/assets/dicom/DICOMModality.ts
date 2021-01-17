/** MEDIGI VIEWER DICOM FILE MODALITY
 * List of supported DICOM file mdoalities.
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

class DICOMModality {
    static LIST: object
}

DICOMModality.LIST = {
    AR: "Autorefraction",
    AS: "Angioscopy (retired)",
    ASMT: "Content Assessment Results",
    AU: "Audio",
    BDUS: "Bone Densitometry (ultrasound)",
    BI: "Biomagnetic imaging",
    BMD: "Bone Densitometry (X-Ray)",
    CD: "Color flow Doppler (retired)",
    CF: "Cinefluorography (retired)",
    CP: "Colposcopy (retired)",
    CR: "Computed Radiography",
    CS: "Cystoscopy (retired)",
    CT: "Computed Tomography",
    DD: "Duplex Doppler (retired)",
    DF: "Digital fluoroscopy (retired)",
    DG: "Diaphanography",
    DM: "Digital microscopy (retired)",
    DOC: "Document",
    DS: "Digital Subtraction Angiography (retired)",
    DX: "Digital Radiography",
    EC: "Echocardiography (retired)",
    ECG: "Electrocardiography",
    EPS: "Cardiac Electrophysiology",
    ES: "Endoscopy",
    FA: "Fluorescein angiography (retired)",
    FID: "Fiducials",
    FS: "Fundoscopy (retired)",
    GM: "General Microscopy",
    HC: "Hard Copy",
    HD: "Hemodynamic Waveform",
    IO: "Intra-Oral Radiography",
    IOL: "Intraocular Lens Data",
    IVOCT: "Intravascular Optical Coherence Tomography",
    IVUS: "Intravascular Ultrasound",
    KER: "Keratometry",
    KO: "Key Object Selection",
    LEN: "Lensometry",
    LP: "Laparoscopy (retired)",
    LS: "Laser surface scan",
    MA: "Magnetic resonance angiography (retired)",
    MG: "Mammography",
    MR: "Magnetic Resonance",
    MS: "Magnetic resonance spectroscopy (retired)",
    NM: "Nuclear Medicine",
    OAM: "Ophthalmic Axial Measurements",
    OCT: "Optical Coherence Tomography (non-Ophthalmic)",
    OP: "Ophthalmic Photography",
    OPM: "Ophthalmic Mapping",
    OPR: "Ophthalmic Refraction (retired)",
    OPT: "Ophthalmic Tomography",
    OPV: "Ophthalmic Visual Field",
    OSS: "Optical Surface Scan",
    OT: "Other",
    PLAN: "Plan",
    PR: "Presentation State",
    PT: "Positron emission tomography (PET)",
    PX: "Panoramic X-Ray",
    REG: "Registration",
    RESP: "Respiratory Waveform",
    RF: "Radio Fluoroscopy",
    RG: "Radiographic imaging (conventional film/screen)",
    RTDOSE: "Radiotherapy Dose",
    RTIMAGE: "Radiotherapy Image",
    RTPLAN: "Radiotherapy Plan",
    RTRECORD: "RT Treatment Record",
    RTSTRUCT: "Radiotherapy Structure Set",
    RWV: "Real World Value Map",
    SEG: "Segmentation",
    SM: "Slide Microscopy",
    SMR: "Stereometric Relationship",
    SR: "SR Document",
    SRF: "Subjective Refraction",
    ST: "Single-photon emission computed tomography (SPECT) (retired)",
    STAIN: "Automated Slide Stainer",
    TG: "Thermography",
    US: "Ultrasound",
    VA: "Visual Acuity",
    VF: "Videofluorography (retired)",
    XA: "X-Ray Angiography",
    XC: "External-camera Photography",
}
export default DICOMModality
