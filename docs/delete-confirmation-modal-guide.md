# DeleteConfirmationModal Usage Guide

## Overview
The `DeleteConfirmationModal` is a reusable component for confirming delete operations throughout the application. It provides a professional, user-friendly interface that replaces the native browser's `window.confirm()`.

## Features
- ✅ Professional design with warning icon
- ✅ Smooth animations (fade in/slide in)
- ✅ Customizable title, message, and button text
- ✅ Shows the item name being deleted
- ✅ Escape key and backdrop click to close
- ✅ Accessible and user-friendly

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | required | Controls modal visibility |
| `onClose` | function | required | Called when modal should close |
| `onConfirm` | function | required | Called when delete is confirmed |
| `title` | string | "Confirm Delete" | Modal header title |
| `message` | string | "Are you sure..." | Warning message text |
| `itemName` | string | "" | Name of item being deleted (optional) |
| `confirmText` | string | "Delete" | Confirm button text |
| `cancelText` | string | "Cancel" | Cancel button text |

## Basic Usage

### 1. Import the Component

```javascript
import DeleteConfirmationModal from './DeleteConfirmationModal';
```

### 2. Add State for Modal

```javascript
const [deleteModal, setDeleteModal] = useState({ 
    isOpen: false, 
    item: null 
});
```

### 3. Create Handler Functions

```javascript
// Open modal
const handleDeleteClick = (item) => {
    setDeleteModal({ isOpen: true, item });
};

// Confirm deletion
const handleDeleteConfirm = async () => {
    if (deleteModal.item) {
        await deleteItem(deleteModal.item.id);
        // Optionally refresh data or show success message
    }
};

// Close modal
const handleClose = () => {
    setDeleteModal({ isOpen: false, item: null });
};
```

### 4. Render the Modal

```javascript
<DeleteConfirmationModal
    isOpen={deleteModal.isOpen}
    onClose={handleClose}
    onConfirm={handleDeleteConfirm}
    title="Delete Item"
    message="Are you sure you want to delete this item? This action cannot be undone."
    itemName={deleteModal.item?.name}
    confirmText="Delete"
/>
```

## Real-World Examples

### Example 1: Product Categories (Current Implementation)

```javascript
const ProductCategories = () => {
    const { deleteCategory } = useProductCategories();
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, category: null });

    const handleDeleteClick = (category) => {
        setDeleteModal({ isOpen: true, category });
    };

    const handleDeleteConfirm = async () => {
        if (deleteModal.category) {
            await deleteCategory(deleteModal.category.id);
        }
    };

    return (
        <>
            {/* Delete button */}
            <button onClick={() => handleDeleteClick(category)}>
                Delete
            </button>

            {/* Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, category: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Category"
                message="Are you sure you want to delete this category? All products in this category will need to be reassigned."
                itemName={deleteModal.category?.name}
                confirmText="Delete Category"
            />
        </>
    );
};
```

### Example 2: Delete Course

```javascript
const CourseList = () => {
    const { deleteCourse } = useCourses();
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, course: null });

    const handleDeleteClick = (course) => {
        setDeleteModal({ isOpen: true, course });
    };

    const handleDeleteConfirm = async () => {
        if (deleteModal.course) {
            await deleteCourse(deleteModal.course.id);
        }
    };

    return (
        <>
            <button onClick={() => handleDeleteClick(course)}>Delete Course</button>

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, course: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Course"
                message="Are you sure you want to delete this course? All associated chapters, exams, and student progress will be lost."
                itemName={deleteModal.course?.title}
                confirmText="Delete Course"
            />
        </>
    );
};
```

### Example 3: Delete User

```javascript
const UserManagement = () => {
    const { deleteUser } = useUsers();
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });

    return (
        <>
            <button onClick={() => setDeleteModal({ isOpen: true, user })}>
                Delete User
            </button>

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, user: null })}
                onConfirm={async () => {
                    if (deleteModal.user) {
                        await deleteUser(deleteModal.user.id);
                    }
                }}
                title="Delete User"
                message="Are you sure you want to delete this user? All their data and access will be permanently removed."
                itemName={deleteModal.user?.email}
                confirmText="Delete User"
                cancelText="Keep User"
            />
        </>
    );
};
```

### Example 4: Bulk Delete

```javascript
const Products = () => {
    const { deleteMultipleProducts } = useProducts();
    const [selectedIds, setSelectedIds] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false });

    const handleBulkDelete = () => {
        setDeleteModal({ isOpen: true });
    };

    return (
        <>
            <button onClick={handleBulkDelete}>
                Delete Selected ({selectedIds.length})
            </button>

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false })}
                onConfirm={async () => {
                    await deleteMultipleProducts(selectedIds);
                    setSelectedIds([]);
                }}
                title="Delete Multiple Products"
                message={`Are you sure you want to delete ${selectedIds.length} products? This action cannot be undone.`}
                confirmText={`Delete ${selectedIds.length} Products`}
            />
        </>
    );
};
```

## Customization Tips

### 1. Different Warning Levels

```javascript
// High-risk deletion
<DeleteConfirmationModal
    title="⚠️ Permanent Deletion"
    message="This will permanently delete all data. There is NO way to recover it."
    confirmText="I Understand, Delete"
/>
```

### 2. Soft Delete

```javascript
<DeleteConfirmationModal
    title="Move to Trash"
    message="This item will be moved to trash and can be restored later."
    confirmText="Move to Trash"
/>
```

### 3. With Additional Details

```javascript
<DeleteConfirmationModal
    title="Delete Batch"
    message={`
        Deleting this batch will affect:
        • ${batch.studentCount} students
        • ${batch.courseCount} assigned courses
        • All progress and certificates
    `}
    itemName={batch.name}
    confirmText="Delete Batch"
/>
```

## Best Practices

1. **Always show item name** - Helps users confirm they're deleting the right thing
2. **Be specific about consequences** - Explain what will happen after deletion
3. **Use appropriate button text** - "Delete Course" is better than just "Delete"
4. **Handle errors** - Show error messages if deletion fails
5. **Provide feedback** - Show success message after successful deletion

## Migration from window.confirm()

**Before:**
```javascript
const handleDelete = (id) => {
    if (window.confirm('Are you sure?')) {
        deleteItem(id);
    }
};
```

**After:**
```javascript
const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });

const handleDeleteClick = (item) => {
    setDeleteModal({ isOpen: true, item });
};

const handleDeleteConfirm = async () => {
    if (deleteModal.item) {
        await deleteItem(deleteModal.item.id);
    }
};

// In JSX:
<DeleteConfirmationModal
    isOpen={deleteModal.isOpen}
    onClose={() => setDeleteModal({ isOpen: false, item: null })}
    onConfirm={handleDeleteConfirm}
    itemName={deleteModal.item?.name}
/>
```

## Files Using This Component

Currently implemented in:
- ✅ `ProductCategories.jsx` - Delete product categories

To be implemented in:
- ⏳ All components with delete functionality
- ⏳ Batch delete operations
- ⏳ User management
- ⏳ Course/Exam deletions

## Accessibility

The modal includes:
- Keyboard navigation (Tab, Enter, Escape)
- Focus trap within modal
- Screen reader friendly labels
- High contrast colors for warning states

## Browser Support

Works in all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
