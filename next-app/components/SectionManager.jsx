import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { useExams } from '../context/ExamContext';

const SectionManager = ({ examId, isOpen, onClose, onSectionsUpdated }) => {
    const { getExamSections, addExamSection, updateExamSection, deleteExamSection } = useExams();

    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSection, setEditingSection] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        section_name: '',
        section_order: 1,
        instructions: '',
        total_marks: '',
        passing_marks: '',
        is_mandatory: true
    });

    useEffect(() => {
        if (isOpen && examId) {
            loadSections();
        }
    }, [isOpen, examId]);

    const loadSections = async () => {
        setLoading(true);
        const data = await getExamSections(examId);
        setSections(data);
        setLoading(false);
    };

    const handleAdd = () => {
        setFormData({
            section_name: '',
            section_order: sections.length + 1,
            instructions: '',
            total_marks: '',
            passing_marks: '',
            is_mandatory: true
        });
        setEditingSection(null);
        setShowAddForm(true);
    };

    const handleEdit = (section) => {
        setFormData({
            section_name: section.section_name,
            section_order: section.section_order,
            instructions: section.instructions || '',
            total_marks: section.total_marks || '',
            passing_marks: section.passing_marks || '',
            is_mandatory: section.is_mandatory
        });
        setEditingSection(section);
        setShowAddForm(true);
    };

    const handleSave = async () => {
        try {
            if (editingSection) {
                await updateExamSection(editingSection.id, formData);
            } else {
                await addExamSection(examId, formData);
            }
            await loadSections();
            setShowAddForm(false);
            setEditingSection(null);
            if (onSectionsUpdated) onSectionsUpdated();
        } catch (error) {
            alert('Error saving section: ' + error.message);
        }
    };

    const handleDelete = async (sectionId) => {
        if (!confirm('Delete this section? Questions in this section will become unsectioned.')) return;

        try {
            await deleteExamSection(sectionId);
            await loadSections();
            if (onSectionsUpdated) onSectionsUpdated();
        } catch (error) {
            alert('Error deleting section: ' + error.message);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]">
            <div className="bg-white rounded-lg w-[90%] max-w-[700px] max-h-[90vh] flex flex-col">
                <div className="py-5 px-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="m-0">Manage Exam Sections</h2>
                    <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1 flex items-center">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center p-10">Loading sections...</div>
                    ) : (
                        <>
                            {/* Sections List */}
                            <div className="mb-5">
                                {sections.length === 0 ? (
                                    <div className="text-center text-gray-600 p-5">
                                        No sections yet. Click "Add Section" to create one.
                                    </div>
                                ) : (
                                    sections.map((section) => (
                                        <div key={section.id} className="p-4 border border-gray-300 rounded mb-3 flex justify-between items-center">
                                            <div>
                                                <div className="font-medium text-base">
                                                    {section.section_order}. {section.section_name}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {section.total_marks && `${section.total_marks} marks`}
                                                    {section.passing_marks && ` | Passing: ${section.passing_marks}`}
                                                    {section.is_mandatory && ' | Mandatory'}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEdit(section)} className="bg-transparent border border-gray-300 rounded p-2 cursor-pointer flex items-center text-gray-600 hover:bg-gray-50">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(section.id)} className="bg-transparent border border-gray-300 rounded p-2 cursor-pointer flex items-center text-red-600 hover:bg-red-50">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add/Edit Form */}
                            {showAddForm ? (
                                <div className="bg-gray-50 p-5 rounded-lg">
                                    <h3 className="mt-0">{editingSection ? 'Edit Section' : 'Add New Section'}</h3>

                                    <div className="flex gap-4 mb-4">
                                        <div className="flex-[2]">
                                            <label className="block mb-2 font-medium text-sm">Section Name *</label>
                                            <input
                                                type="text"
                                                name="section_name"
                                                value={formData.section_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Part A - Multiple Choice"
                                                className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block mb-2 font-medium text-sm">Order</label>
                                            <input
                                                type="number"
                                                name="section_order"
                                                value={formData.section_order}
                                                onChange={handleChange}
                                                min="1"
                                                className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block mb-2 font-medium text-sm">Instructions</label>
                                        <textarea
                                            name="instructions"
                                            value={formData.instructions}
                                            onChange={handleChange}
                                            placeholder="Instructions for this section..."
                                            rows={3}
                                            className="w-full py-2 px-3 border border-gray-300 rounded text-sm font-inherit resize-y"
                                        />
                                    </div>

                                    <div className="flex gap-4 mb-4">
                                        <div className="flex-1">
                                            <label className="block mb-2 font-medium text-sm">Total Marks</label>
                                            <input
                                                type="number"
                                                name="total_marks"
                                                value={formData.total_marks}
                                                onChange={handleChange}
                                                step="0.5"
                                                min="0"
                                                placeholder="e.g., 40"
                                                className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block mb-2 font-medium text-sm">Passing Marks</label>
                                            <input
                                                type="number"
                                                name="passing_marks"
                                                value={formData.passing_marks}
                                                onChange={handleChange}
                                                step="0.5"
                                                min="0"
                                                placeholder="e.g., 20"
                                                className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="is_mandatory"
                                                checked={formData.is_mandatory}
                                                onChange={handleChange}
                                            />
                                            <span>Mandatory (All questions must be answered)</span>
                                        </label>
                                    </div>

                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => {
                                                setShowAddForm(false);
                                                setEditingSection(null);
                                            }}
                                            className="py-2.5 px-5 bg-gray-500 text-white border-none rounded cursor-pointer text-sm hover:bg-gray-600"
                                        >
                                            Cancel
                                        </button>
                                        <button onClick={handleSave} className="py-2.5 px-5 bg-green-600 text-white border-none rounded cursor-pointer flex items-center gap-2 text-sm font-medium hover:bg-green-700">
                                            <Save size={16} />
                                            {editingSection ? 'Update' : 'Save'} Section
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={handleAdd} className="w-full p-3 bg-blue-600 text-white border-none rounded cursor-pointer flex items-center justify-center gap-2 text-sm font-medium hover:bg-blue-700">
                                    <Plus size={16} />
                                    Add Section
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SectionManager;
