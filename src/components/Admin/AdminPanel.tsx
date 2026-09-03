// components/Admin/AdminPanel.tsx
import React, { useState, useMemo } from 'react';
import { MenuItem } from '../../types';
import { useMenu } from '../../hooks/useMenu';
import styles from './AdminPanel.module.scss';

interface AdminPanelProps {
  onClose: () => void;
}

interface CustomizationOption {
  name: string;
  options: string[];
  default?: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { items, toggleStock, updateItem } = useMenu();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'inStock' | 'outOfStock'>('all');
  
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({});

  // ✅ State for customization options editing
  const [customizationOptions, setCustomizationOptions] = useState<CustomizationOption[]>([]);
  const [editingCustomizationIndex, setEditingCustomizationIndex] = useState<number | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        filter === 'all' ? true :
        filter === 'inStock' ? item.inStock === true :
        filter === 'outOfStock' ? item.inStock === false : true;
      return matchesSearch && matchesFilter;
    });
  }, [items, searchTerm, filter]);

  const handleToggle = async (itemId: number) => {
    await toggleStock(itemId);
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      desc: item.desc,
      price: item.price,
      costPrice: item.costPrice,
      img: item.img,
      category: item.category,
      isVeg: item.isVeg,
      isSpicy: item.isSpicy,
      isGlutenFree: item.isGlutenFree,
      preparationTime: item.preparationTime,
      calories: item.calories,
      rating: item.rating,
      reviewCount: item.reviewCount,
      ingredients: item.ingredients,
      nutritionalInfo: item.nutritionalInfo,
      attributes: item.attributes,
      customizationOptions: item.customizationOptions || [],
    });
    setCustomizationOptions(item.customizationOptions || []);
    setEditingCustomizationIndex(null);
  };

  // ✅ Handle customization option changes
  const handleCustomizationChange = (index: number, field: string, value: any) => {
    const updated = [...customizationOptions];
    updated[index] = { ...updated[index], [field]: value };
    setCustomizationOptions(updated);
    setEditForm({ ...editForm, customizationOptions: updated });
  };

  // ✅ Add new customization option
  const handleAddCustomization = () => {
    const newOption: CustomizationOption = {
      name: '',
      options: [],
      default: ''
    };
    setCustomizationOptions([...customizationOptions, newOption]);
    setEditForm({ ...editForm, customizationOptions: [...customizationOptions, newOption] });
    setEditingCustomizationIndex(customizationOptions.length);
  };

  // ✅ Remove customization option
  const handleRemoveCustomization = (index: number) => {
    const updated = customizationOptions.filter((_, i) => i !== index);
    setCustomizationOptions(updated);
    setEditForm({ ...editForm, customizationOptions: updated });
    if (editingCustomizationIndex === index) {
      setEditingCustomizationIndex(null);
    }
  };

  // ✅ Handle options string to array conversion
  const handleOptionsChange = (index: number, optionsString: string) => {
    const options = optionsString.split(',').map(s => s.trim()).filter(Boolean);
    handleCustomizationChange(index, 'options', options);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    try {
      // ✅ Include customization options in the update
      const updatedItem = {
        ...editForm,
        customizationOptions: customizationOptions
      };
      
      await updateItem(editingItem.id, updatedItem);
      setEditingItem(null);
      setEditForm({});
      setCustomizationOptions([]);
      alert('✅ Menu item updated successfully!');
    } catch (error) {
      alert('❌ Failed to update menu item');
      console.error(error);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditForm({});
    setCustomizationOptions([]);
    setEditingCustomizationIndex(null);
  };

  const inStockCount = items.filter(item => item.inStock === true).length;
  const outOfStockCount = items.filter(item => item.inStock === false).length;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Manage Menu Items</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Items</span>
            <span className={styles.statValue}>{items.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>In Stock</span>
            <span className={`${styles.statValue} ${styles.inStock}`}>{inStockCount}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Out of Stock</span>
            <span className={`${styles.statValue} ${styles.outOfStock}`}>{outOfStockCount}</span>
          </div>
        </div>
        
        <div className={styles.controls}>
          <input
            type="text"
            placeholder="Search items by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className={styles.filterSelect}
          >
            <option value="all">All Items</option>
            <option value="inStock">In Stock</option>
            <option value="outOfStock">Out of Stock</option>
          </select>
        </div>

        <div className={styles.itemList}>
          {filteredItems.map(item => (
            <div key={item.id} className={styles.itemRow}>
              <div className={styles.itemInfo}>
                <img src={item.img} alt={item.name} className={styles.itemImage} />
                <div>
                  <div className={styles.itemName}>{item.name}</div>
                  <div className={styles.itemDetails}>
                    <span className={styles.itemCategory}>{item.category}</span>
                    <span className={styles.itemPrice}>Rs {item.price}</span>
                    {item.costPrice && item.costPrice > 0 && (
                      <span className={styles.itemCostPrice}>Rs {item.costPrice}</span>
                    )}
                  </div>
                  {item.customizationOptions && item.customizationOptions.length > 0 && (
                    <div className={styles.customizationBadge}>
                      {item.customizationOptions.length} customization(s)
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.itemStatus}>
                <span className={item.inStock ? styles.inStockBadge : styles.outOfStockBadge}>
                  {item.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
                <button
                  className={`${styles.toggleBtn} ${!item.inStock ? styles.outOfStockBtn : ''}`}
                  onClick={() => handleToggle(item.id)}
                >
                  {item.inStock ? 'Mark Out of Stock' : 'Restock'}
                </button>
                <button
                  className={styles.editBtn}
                  onClick={() => handleEditClick(item)}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className={styles.emptyState}>
              No items found matching your criteria
            </div>
          )}
        </div>

        {/* ✅ Edit Modal with Customization Options */}
        {editingItem && (
          <div className={styles.editModal}>
            <div className={styles.editModalContent}>
              <div className={styles.editModalHeader}>
                <h3>Edit Menu Item</h3>
                <button className={styles.closeBtn} onClick={handleCancelEdit}>✕</button>
              </div>
              
              <div className={styles.editForm}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Name *</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Item name"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <input
                      type="text"
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      placeholder="Category"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={editForm.desc || ''}
                    onChange={(e) => setEditForm({ ...editForm, desc: e.target.value })}
                    placeholder="Item description"
                    rows={3}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Price (Rs) *</label>
                    <input
                      type="number"
                      value={editForm.price || ''}
                      onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                      placeholder="Price"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Cost Price (Rs)</label>
                    <input
                      type="number"
                      value={editForm.costPrice || ''}
                      onChange={(e) => setEditForm({ ...editForm, costPrice: parseFloat(e.target.value) || undefined })}
                      placeholder="Cost price"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Image URL *</label>
                    <input
                      type="text"
                      value={editForm.img || ''}
                      onChange={(e) => setEditForm({ ...editForm, img: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Preparation Time</label>
                    <input
                      type="text"
                      value={editForm.preparationTime || ''}
                      onChange={(e) => setEditForm({ ...editForm, preparationTime: e.target.value })}
                      placeholder="e.g., 15-20 mins"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Rating</label>
                    <input
                      type="number"
                      value={editForm.rating || ''}
                      onChange={(e) => setEditForm({ ...editForm, rating: parseFloat(e.target.value) || undefined })}
                      placeholder="0-5"
                      min="0"
                      max="5"
                      step="0.1"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Review Count</label>
                    <input
                      type="number"
                      value={editForm.reviewCount || ''}
                      onChange={(e) => setEditForm({ ...editForm, reviewCount: parseInt(e.target.value) || undefined })}
                      placeholder="Number of reviews"
                      min="0"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Calories</label>
                    <input
                      type="number"
                      value={editForm.calories || ''}
                      onChange={(e) => setEditForm({ ...editForm, calories: parseInt(e.target.value) || undefined })}
                      placeholder="Calories"
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Ingredients (comma separated)</label>
                    <input
                      type="text"
                      value={editForm.ingredients?.join(', ') || ''}
                      onChange={(e) => setEditForm({ 
                        ...editForm, 
                        ingredients: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="Chicken, Cream, Spices"
                    />
                  </div>
                </div>

                <div className={styles.checkboxRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editForm.isVeg || false}
                      onChange={(e) => setEditForm({ ...editForm, isVeg: e.target.checked })}
                    />
                    Vegetarian
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editForm.isSpicy || false}
                      onChange={(e) => setEditForm({ ...editForm, isSpicy: e.target.checked })}
                    />
                    Spicy
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editForm.isGlutenFree || false}
                      onChange={(e) => setEditForm({ ...editForm, isGlutenFree: e.target.checked })}
                    />
                    Gluten Free
                  </label>
                </div>

                {/* ✅ CUSTOMIZATION OPTIONS SECTION */}
                <div className={styles.customizationSection}>
                  <div className={styles.sectionHeader}>
                    <h4>🎨 Customization Options</h4>
                    <button 
                      className={styles.addCustomizationBtn}
                      onClick={handleAddCustomization}
                    >
                      + Add Option
                    </button>
                  </div>

                  {customizationOptions.length === 0 ? (
                    <p className={styles.emptyCustomization}>
                      No customization options added yet. Click "Add Option" to create one.
                    </p>
                  ) : (
                    <div className={styles.customizationList}>
                      {customizationOptions.map((option, index) => (
                        <div key={index} className={styles.customizationItem}>
                          <div className={styles.customizationHeader}>
                            <span className={styles.customizationIndex}>#{index + 1}</span>
                            <button
                              className={styles.removeCustomizationBtn}
                              onClick={() => handleRemoveCustomization(index)}
                            >
                              ✕
                            </button>
                          </div>
                          
                          <div className={styles.formGroup}>
                            <label>Option Name</label>
                            <input
                              type="text"
                              value={option.name || ''}
                              onChange={(e) => handleCustomizationChange(index, 'name', e.target.value)}
                              placeholder="e.g., Sauce, Size, Add-ons"
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label>Options (comma separated)</label>
                            <input
                              type="text"
                              value={option.options.join(', ')}
                              onChange={(e) => handleOptionsChange(index, e.target.value)}
                              placeholder="e.g., Spicy, Medium, Mild"
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label>Default Option</label>
                            <input
                              type="text"
                              value={option.default || ''}
                              onChange={(e) => handleCustomizationChange(index, 'default', e.target.value)}
                              placeholder="Default option (must be one of the options above)"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.formActions}>
                  <button className={styles.cancelBtn} onClick={handleCancelEdit}>
                    Cancel
                  </button>
                  <button className={styles.saveBtn} onClick={handleSaveEdit}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;