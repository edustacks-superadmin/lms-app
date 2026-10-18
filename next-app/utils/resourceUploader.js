import { read, utils, write } from 'xlsx';

/**
 * Parse Excel/CSV file and return array of grouped resources
 */
export const parseResourceFile = async (file) => {
    try {
        const data = await file.arrayBuffer();
        const workbook = read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet);

        // Grouping logic: multiple posts can belong to one syllabus resource
        const resourcesMap = new Map();
        let rowsProcessed = 0;

        jsonData.forEach((row) => {
            const title = row['Exam Title'] || row['Resource Title'];
            const fileUrl = row['File URL'];

            if (!title || !fileUrl) return;
            rowsProcessed++;

            const key = `${title}|${fileUrl}`;

            if (!resourcesMap.has(key)) {
                resourcesMap.set(key, {
                    title: title,
                    category: row['Category'] || 'Syllabus',
                    file_url: fileUrl,
                    status: row['Status'] || 'Active',
                    description: row['Description'] || '',
                    metadata: {
                        paper: row['Paper'] || '',
                        subject_code: row['Subject Code'] || '',
                        standard: row['Standard'] || '',
                        posts: []
                    }
                });
            }

            const resource = resourcesMap.get(key);

            // Add post if post name exists
            if (row['Post Name']) {
                resource.metadata.posts.push({
                    name: row['Post Name'],
                    code: row['Post Code'] || '',
                    dept: row['Department'] || ''
                });
            }
        });

        return {
            resources: Array.from(resourcesMap.values()),
            totalRows: rowsProcessed
        };
    } catch (error) {
        throw new Error('Failed to parse file: ' + error.message);
    }
};

/**
 * Validate resources data
 */
export const validateResources = (resources) => {
    const errors = [];
    resources.forEach((res, index) => {
        if (!res.title) errors.push(`Entry ${index + 1}: Exam Title is missing`);
        if (!res.file_url) errors.push(`Entry ${index + 1}: File URL is missing`);
    });
    return errors;
};

/**
 * Bulk upload resources via API
 */
export const bulkUploadResources = async (resources, instituteId, onProgress) => {
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    const total = resources.length;

    for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];

        if (onProgress) {
            onProgress({
                current: i + 1,
                total: total,
                currentItem: resource.title
            });
        }

        try {
            const response = await fetch('/api/admin/resources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...resource,
                    institute_id: instituteId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload');
            }

            results.success++;
        } catch (error) {
            results.failed++;
            results.errors.push({
                item: resource.title,
                error: error.message
            });
        }
    }

    return results;
};

/**
 * Generate and download example Excel template
 */
export const downloadResourceTemplate = () => {
    const template = [
        {
            'Exam Title': 'Combined Technical Services Examination - Diploma Level',
            'Category': 'Syllabus',
            'File URL': 'https://example.com/syllabus.pdf',
            'Paper': 'Civil Engineering',
            'Subject Code': '398',
            'Standard': 'Diploma',
            'Post Name': 'Junior Draughting Officer',
            'Post Code': '4546',
            'Department': 'Highways Department'
        },
        {
            'Exam Title': 'Combined Technical Services Examination - Diploma Level',
            'Category': 'Syllabus',
            'File URL': 'https://example.com/syllabus.pdf',
            'Paper': 'Civil Engineering',
            'Subject Code': '398',
            'Standard': 'Diploma',
            'Post Name': 'Overseer',
            'Post Code': '5464',
            'Department': 'PWD'
        }
    ];

    const worksheet = utils.json_to_sheet(template);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Syllabus Template');

    // Write and download
    const buffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'syllabus_bulk_upload_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
};
