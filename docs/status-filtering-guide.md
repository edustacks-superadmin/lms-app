# Status-Based Sidebar Filtering Guide

## Overview
This guide explains how to implement and use status-based filtering in sidebars across your LMS application. This pattern is used in Products, Posts, Exams, and can be applied to other entities.

## Pattern Explanation

### How It Works

The status filtering pattern uses **URL query parameters** to maintain filter state. This approach provides several benefits:
1. **Shareable URLs** - Users can bookmark or share filtered views
2. **Browser back/forward** - Navigation works naturally
3. **Persistent state** - Filter selections survive page refreshes
4. **Simple state management** - No complex global state needed

### Key Components

#### 1. **Sidebar Component** (e.g., `StoreSidebar.jsx`)
- Displays status filter buttons
- Reads current status from URL parameters
- Updates URL when status changes
- Highlights the active status

#### 2. **List Component** (e.g., `ProductList.jsx`)
- Reads status from URL parameters
- Filters data based on status
- Displays filtered results

## Implementation Steps

### Step 1: Update Sidebar Component

```javascript
import { useSearchParams } from 'react-router-dom';

const YourSidebar = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentStatus = searchParams.get('status') || 'default_status';

    // Handle status change
    const handleStatusChange = (status) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('status', status);
        setSearchParams(newParams);
    };

    // Dynamic button styling
    const getButtonStyle = (status) => ({
        justifyContent: 'flex-start',
        width: '100%',
        color: currentStatus === status ? 'white' : 'var(--primary-color)',
        background: currentStatus === status ? 'var(--primary-color)' : 'transparent',
        fontWeight: currentStatus === status ? '500' : '400'
    });

    return (
        <aside>
            <button 
                style={getButtonStyle('draft')}
                onClick={() => handleStatusChange('draft')}
            >
                Drafts
            </button>
            <button 
                style={getButtonStyle('approved')}
                onClick={() => handleStatusChange('approved')}
            >
                Approved
            </button>
            {/* Add more status buttons */}
        </aside>
    );
};
```

### Step 2: Update List Component

```javascript
import { useSearchParams } from 'react-router-dom';

const YourList = () => {
    const [searchParams] = useSearchParams();
    const statusFilter = searchParams.get('status') || 'approved';
    const { items } = useYourContext();

    // Filter items by status
    const filteredItems = items.filter(item => {
        const itemStatus = item.status || 'approved';
        return itemStatus === statusFilter;
    });

    // Get display label for current status
    const getStatusLabel = () => {
        const labels = {
            draft: 'Draft Items',
            approved: 'Approved Items',
            inactive: 'Inactive Items'
        };
        return labels[statusFilter] || 'Items';
    };

    return (
        <div>
            <h2>{getStatusLabel()}</h2>
            {/* Render filtered items */}
        </div>
    );
};
```

### Step 3: Add Status Field to Database

Ensure your database table has a `status` column:

```sql
ALTER TABLE your_table ADD COLUMN status VARCHAR(50) DEFAULT 'approved';
```

Common status values:
- `draft` - Item is being created but not published
- `pending` - Awaiting approval
- `approved` - Active and visible
- `inactive` - Disabled/archived
- `offer` - Special promotion status (for products)

## Real-World Examples

### Products (Store)
**Status Options:**
- **Drafts** - Products being created
- **Pending Approval** - Submitted for review
- **Approved** - Active in store
- **Inactive** - Hidden from store
- **Offer** - Products on sale

### Posts
**Status Options:**
- **Published** - Live posts
- **Deleted** - Soft-deleted posts
- **Drafts** - Work in progress

### Exams
**Status Options:**
- **Running Tests** - Currently active
- **Upcoming Tests** - Scheduled for future
- **Completed Tests** - Finished exams

## Combining Multiple Filters

You can combine status filtering with other filters (category, tags, etc.):

```javascript
const filteredItems = items.filter(item => {
    // Status filter
    const itemStatus = item.status || 'approved';
    if (itemStatus !== statusFilter) return false;
    
    // Category filter
    if (categoryFilter && item.category_id !== categoryFilter) return false;
    
    // Tags filter
    if (selectedTags.length > 0) {
        if (!item.tags?.some(tag => selectedTags.includes(tag))) return false;
    }
    
    return true;
});
```

## Best Practices

### 1. **Set Sensible Defaults**
```javascript
const currentStatus = searchParams.get('status') || 'approved';
```
Most users should see active/approved items by default.

### 2. **Preserve Other Filters**
When changing status, keep other active filters:
```javascript
const handleStatusChange = (status) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('status', status);
    setSearchParams(newParams);
};
```

### 3. **Visual Feedback**
Always highlight the active filter button so users know what they're viewing.

### 4. **Handle Missing Status**
Some items might not have a status field. Provide a fallback:
```javascript
const itemStatus = item.status || 'approved';
```

### 5. **Clear Empty Results**
Show helpful messages when no items match the filter:
```javascript
{filteredItems.length === 0 && (
    <p>No {statusFilter} items found.</p>
)}
```

## Adding New Status Types

To add a new status type:

1. **Update Sidebar** - Add a new button
2. **Update Filter Logic** - Include in filter conditions
3. **Update Labels** - Add to `getStatusLabel()` function
4. **Update Database** - Ensure products can have this status
5. **Update Forms** - Allow setting the new status when creating/editing

## Workflow Management

Use status fields to create approval workflows:

```
draft → pending → approved
                ↓
              rejected → draft
```

Example approval logic:
```javascript
const approveItem = async (itemId) => {
    await updateItem(itemId, { status: 'approved' });
};

const rejectItem = async (itemId) => {
    await updateItem(itemId, { status: 'draft' });
};
```

## Testing Checklist

- [ ] Each status button filters correctly
- [ ] Active button is visually highlighted
- [ ] URL updates when clicking status buttons
- [ ] Browser back/forward works correctly
- [ ] Status filter combines with category/tag filters
- [ ] Empty states show appropriate messages
- [ ] Default status is set correctly
- [ ] Status persists on page refresh

## Summary

Status-based filtering provides a powerful, user-friendly way to organize and view content in different states. By using URL parameters, the pattern is simple to implement, works with browser navigation, and provides a great user experience.

Key files to reference:
- `src/components/StoreSidebar.jsx` - Products sidebar with status filters
- `src/components/ProductList.jsx` - Products list with status filtering
- `src/components/PostsSidebar.jsx` - Posts sidebar example
- `src/components/ExamsSidebar.jsx` - Exams sidebar example
