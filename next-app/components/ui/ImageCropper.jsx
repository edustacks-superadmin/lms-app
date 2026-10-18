import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from './cropUtils'; // We'll create this utility file next
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

const ImageCropper = ({ imageSrc, onCropComplete, onCancel, aspect = 16 / 9 }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [processing, setProcessing] = useState(false);

    const onCropChange = (crop) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom) => {
        setZoom(zoom);
    };

    const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        setProcessing(true);
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedImageBlob);
        } catch (e) {
            console.error(e);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-slate-800">Crop Image</h3>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="relative w-full h-96 bg-slate-900">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropCompleteCallback}
                    />
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <ZoomOut size={16} className="text-slate-400" />
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(e.target.value)}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <ZoomIn size={16} className="text-slate-400" />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={processing}
                            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            {processing ? 'Processing...' : <><Check size={18} /> Apply Crop</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
