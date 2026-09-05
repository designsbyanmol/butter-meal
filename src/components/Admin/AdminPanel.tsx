// components/Admin/AdminPanel.tsx
import React, { useState, useMemo } from 'react';
import { MenuItem } from '../../types';
import { useMenu } from '../../hooks/useMenu';
import styles from './AdminPanel.module.scss';
import { CloseIcon } from '../../assets/svgs';

interface AdminPanelProps {
  onClose: () => void;
}

interface CustomizationOption {
  name: string;
  options: string[];
  default?: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { items, toggleStock, updateItem, addItem, deleteItem } = useMenu();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'inStock' | 'outOfStock'>('all');
  
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({});

  // ✅ State for customization options editing
  const [customizationOptions, setCustomizationOptions] = useState<CustomizationOption[]>([]);
  const [editingCustomizationIndex, setEditingCustomizationIndex] = useState<number | null>(null);

  // ✅ State for Add New Item
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemForm, setNewItemForm] = useState<Partial<MenuItem>>({
    name: '',
    desc: '',
    price: 0,
    costPrice: 0,
    img: '',
    category: '',
    isVeg: false,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: '',
    calories: 0,
    rating: 0,
    reviewCount: 0,
    ingredients: [],
    nutritionalInfo: {},
    attributes: {},
    customizationOptions: [],
    inStock: true,
  });
  const [newCustomizationOptions, setNewCustomizationOptions] = useState<CustomizationOption[]>([]);

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
  // Find the item to check current stock status
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  
  const action = item.inStock ? 'Out of Stock' : 'In Stock';
  const message = `Are you sure you want to change this item to "${action}"?`;
  
  if (window.confirm(message)) {
    await toggleStock(itemId);
  }
};

  // Add this state after your other state declarations
const [ingredientsInput, setIngredientsInput] = useState('');

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
    setIngredientsInput(item.ingredients?.join(', ') || '');
    setCustomizationOptions(item.customizationOptions || []);
    setEditingCustomizationIndex(null);
  };

  // ✅ Handle customization option changes for edit
  const handleCustomizationChange = (index: number, field: string, value: any) => {
    const updated = [...customizationOptions];
    updated[index] = { ...updated[index], [field]: value };
    setCustomizationOptions(updated);
    setEditForm({ ...editForm, customizationOptions: updated });
  };

  // ✅ Add new customization option for edit
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

  // ✅ Remove customization option for edit
  const handleRemoveCustomization = (index: number) => {
    const updated = customizationOptions.filter((_, i) => i !== index);
    setCustomizationOptions(updated);
    setEditForm({ ...editForm, customizationOptions: updated });
    if (editingCustomizationIndex === index) {
      setEditingCustomizationIndex(null);
    }
  };

  // ✅ Handle options string to array conversion for edit
  const handleOptionsChange = (index: number, optionsString: string) => {
    const options = optionsString.split(',').map(s => s.trim()).filter(Boolean);
    handleCustomizationChange(index, 'options', options);
  };

  // ✅ Handle new item customization changes
  const handleNewCustomizationChange = (index: number, field: string, value: any) => {
    const updated = [...newCustomizationOptions];
    updated[index] = { ...updated[index], [field]: value };
    setNewCustomizationOptions(updated);
    setNewItemForm({ ...newItemForm, customizationOptions: updated });
  };

  // ✅ Add new customization option for new item
  const handleAddNewCustomization = () => {
    const newOption: CustomizationOption = {
      name: '',
      options: [],
      default: ''
    };
    setNewCustomizationOptions([...newCustomizationOptions, newOption]);
    setNewItemForm({ ...newItemForm, customizationOptions: [...newCustomizationOptions, newOption] });
  };

  // ✅ Remove customization option for new item
  const handleRemoveNewCustomization = (index: number) => {
    const updated = newCustomizationOptions.filter((_, i) => i !== index);
    setNewCustomizationOptions(updated);
    setNewItemForm({ ...newItemForm, customizationOptions: updated });
  };

  // ✅ Handle options string to array conversion for new item
  const handleNewOptionsChange = (index: number, optionsString: string) => {
    const options = optionsString.split(',').map(s => s.trim()).filter(Boolean);
    handleNewCustomizationChange(index, 'options', options);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    try {
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

  // ✅ Handle Delete Item
  const handleDeleteItem = async () => {
    if (!editingItem) return;
    
    if (window.confirm(`Are you sure you want to delete "${editingItem.name}"? This action cannot be undone.`)) {
      try {
        await deleteItem(editingItem.id);
        setEditingItem(null);
        setEditForm({});
        setCustomizationOptions([]);
        alert('✅ Menu item deleted successfully!');
      } catch (error) {
        alert('❌ Failed to delete menu item');
        console.error(error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditForm({});
    setCustomizationOptions([]);
    setIngredientsInput('');
    setEditingCustomizationIndex(null);
  };

  const [newIngredientsInput, setNewIngredientsInput] = useState('');
  // ✅ Handle Add New Item
  const handleAddNewItem = () => {
    setIsAddingNew(true);
    setNewItemForm({
      name: '',
      desc: '',
      price: 0,
      costPrice: 0,
      img: '',
      category: '',
      isVeg: false,
      isSpicy: false,
      isGlutenFree: false,
      preparationTime: '',
      calories: 0,
      rating: 0,
      reviewCount: 0,
      ingredients: [],
      nutritionalInfo: {},
      attributes: {},
      customizationOptions: [],
      inStock: true,
    });
    setNewIngredientsInput('');
    setNewCustomizationOptions([]);
  };

  const handleSaveNewItem = async () => {
    // Validate required fields
    if (!newItemForm.name || !newItemForm.price || !newItemForm.img) {
      alert('❌ Please fill in all required fields (Name, Price, Image URL)');
      return;
    }

    try {
      const newItem: Omit<MenuItem, 'id'> = {
        name: newItemForm.name,
        desc: newItemForm.desc || '',
        price: newItemForm.price || 0,
        costPrice: newItemForm.costPrice || 0,
        img: newItemForm.img,
        category: newItemForm.category || '',
        isVeg: newItemForm.isVeg || false,
        isSpicy: newItemForm.isSpicy || false,
        isGlutenFree: newItemForm.isGlutenFree || false,
        preparationTime: newItemForm.preparationTime || '',
        calories: newItemForm.calories || 0,
        rating: newItemForm.rating || 0,
        reviewCount: newItemForm.reviewCount || 0,
        ingredients: newItemForm.ingredients || [],
        nutritionalInfo: newItemForm.nutritionalInfo || {},
        attributes: newItemForm.attributes || {},
        customizationOptions: newCustomizationOptions,
        inStock: newItemForm.inStock !== undefined ? newItemForm.inStock : true,
      };
      
      await addItem(newItem);
      setIsAddingNew(false);
      setNewItemForm({});
      setNewCustomizationOptions([]);
      alert('✅ New menu item added successfully!');
    } catch (error) {
      alert('❌ Failed to add menu item');
      console.error(error);
    }
  };

  const handleCancelNewItem = () => {
    setIsAddingNew(false);
    setNewItemForm({});
    setNewIngredientsInput('');
    setNewCustomizationOptions([]);
  };

  const inStockCount = items.filter(item => item.inStock === true).length;
  const outOfStockCount = items.filter(item => item.inStock === false).length;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Menu Items</h2>
          <button 
            className={styles.addNewBtn}
            onClick={handleAddNewItem}
          >
            + Add New Item
          </button>
          <button className={styles.closeBtn} onClick={onClose}><CloseIcon width={18} height={18} fill="#4d4d4d"/></button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>All Items</span>
            <span className={styles.statValue}>{items.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Active</span>
            <span className={`${styles.statValue} ${styles.inStock}`}>{inStockCount}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>InActive</span>
            <span className={`${styles.statValue} ${styles.outOfStock}`}>{outOfStockCount}</span>
          </div>
        </div>
        
        <div className={styles.controls}>
          <input
            type="text"
            placeholder="Search items..."
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
                  {/*<div className={styles.itemDetails}>
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
                  )}*/}
                </div>
              </div>
              <div className={styles.itemStatus}>
                <div className={styles.stock_wrap}>
                  <span className={item.inStock ? styles.inStockBadge : styles.outOfStockBadge}>
                    {item.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
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

        {/* ✅ Add New Item Modal */}
        {isAddingNew && (
          <div className={styles.editModal}>
            <div className={styles.editModalContent}>
              <div className={styles.editModalHeader}>
                <h3>Add New Menu Item</h3>
                <button className={styles.closeBtn} onClick={handleCancelNewItem}><CloseIcon width={18} height={18} fill="#4d4d4d"/></button>
              </div>
              
              <div className={styles.editForm}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Name *</label>
                    <input
                      type="text"
                      value={newItemForm.name || ''}
                      onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                      placeholder="Item name"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <input
                      type="text"
                      value={newItemForm.category || ''}
                      onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                      placeholder="Category"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={newItemForm.desc || ''}
                    onChange={(e) => setNewItemForm({ ...newItemForm, desc: e.target.value })}
                    placeholder="Item description"
                    rows={3}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Price (Rs) *</label>
                    <input
                      type="number"
                      value={newItemForm.price || ''}
                      onChange={(e) => setNewItemForm({ ...newItemForm, price: parseFloat(e.target.value) })}
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
                      value={newItemForm.costPrice || ''}
                      onChange={(e) => setNewItemForm({ ...newItemForm, costPrice: parseFloat(e.target.value) || undefined })}
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
                      value={newItemForm.img || ''}
                      onChange={(e) => setNewItemForm({ ...newItemForm, img: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Preparation Time</label>
                    <input
                      type="text"
                      value={newItemForm.preparationTime || ''}
                      onChange={(e) => setNewItemForm({ ...newItemForm, preparationTime: e.target.value })}
                      placeholder="e.g., 15-20 mins"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Rating</label>
                    <input
                      type="number"
                      value={newItemForm.rating || ''}
                      onChange={(e) => setNewItemForm({ ...newItemForm, rating: parseFloat(e.target.value) || undefined })}
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
                      value={newItemForm.reviewCount || ''}
                      onChange={(e) => setNewItemForm({ ...newItemForm, reviewCount: parseInt(e.target.value) || undefined })}
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
                      value={newItemForm.calories || ''}
                      onChange={(e) => setNewItemForm({ ...newItemForm, calories: parseInt(e.target.value) || undefined })}
                      placeholder="Calories"
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
  <label>Ingredients (comma separated)</label>
  <input
    type="text"
    value={newIngredientsInput}
    onChange={(e) => {
      const value = e.target.value;
      setNewIngredientsInput(value);
      const ingredientsArray = value ? value.split(',').map(s => s.trim()).filter(s => s !== '') : [];
      setNewItemForm({ 
        ...newItemForm, 
        ingredients: ingredientsArray
      });
    }}
    placeholder="Chicken, Cream, Spices"
  />
</div>
                </div>

                <div className={styles.checkboxRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newItemForm.isVeg || false}
                      onChange={(e) => setNewItemForm({ ...newItemForm, isVeg: e.target.checked })}
                    />
                    Vegetarian
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newItemForm.isSpicy || false}
                      onChange={(e) => setNewItemForm({ ...newItemForm, isSpicy: e.target.checked })}
                    />
                    Spicy
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newItemForm.isGlutenFree || false}
                      onChange={(e) => setNewItemForm({ ...newItemForm, isGlutenFree: e.target.checked })}
                    />
                    Gluten Free
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newItemForm.inStock !== undefined ? newItemForm.inStock : true}
                      onChange={(e) => setNewItemForm({ ...newItemForm, inStock: e.target.checked })}
                    />
                    In Stock
                  </label>
                </div>

                {/* ✅ CUSTOMIZATION OPTIONS SECTION FOR NEW ITEM */}
                <div className={styles.customizationSection}>
                  <div className={styles.sectionHeader}>
                    <h4>Customization Options</h4>
                    <button 
                      className={styles.addCustomizationBtn}
                      onClick={handleAddNewCustomization}
                    >
                      + Add
                    </button>
                  </div>

                  {newCustomizationOptions.length === 0 ? (
                    <p className={styles.emptyCustomization}>
                      No customization options added yet. Click "+ Add" to create one.
                    </p>
                  ) : (
                    <div className={styles.customizationList}>
                      {newCustomizationOptions.map((option, index) => (
                        <div key={index} className={styles.customizationItem}>
                          <div className={styles.customizationHeader}>
                            <span className={styles.customizationIndex}>#{index + 1}</span>
                            <button
                              className={styles.removeCustomizationBtn}
                              onClick={() => handleRemoveNewCustomization(index)}
                            >
                              <CloseIcon width={18} height={18} fill="#4d4d4d"/>
                            </button>
                          </div>
                          
                          <div className={styles.formGroup}>
                            <label>Option Name</label>
                            <input
                              type="text"
                              value={option.name || ''}
                              onChange={(e) => handleNewCustomizationChange(index, 'name', e.target.value)}
                              placeholder="e.g., Sauce, Size, Add-ons"
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label>Options (comma separated)</label>
                            <input
                              type="text"
                              value={option.options.join(', ')}
                              onChange={(e) => handleNewOptionsChange(index, e.target.value)}
                              placeholder="e.g., Spicy, Medium, Mild"
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label>Default Option</label>
                            <input
                              type="text"
                              value={option.default || ''}
                              onChange={(e) => handleNewCustomizationChange(index, 'default', e.target.value)}
                              placeholder="Default option (must be one of the options above)"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.formActions}>
                  <button className={styles.cancelBtn} onClick={handleCancelNewItem}>
                    Cancel
                  </button>
                  <button className={styles.saveBtn} onClick={handleSaveNewItem}>
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Edit Modal with Customization Options and Delete Button */}
        {editingItem && (
          <div className={styles.editModal}>
            <div className={styles.editModalContent}>
              <div className={styles.editModalHeader}>
                <h3>Edit Menu Item</h3>
                <button className={styles.closeBtn} onClick={handleCancelEdit}><CloseIcon width={18} height={18} fill="#4d4d4d"/></button>
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
    value={ingredientsInput}
    onChange={(e) => {
      const value = e.target.value;
      setIngredientsInput(value);
      // Convert to array only when needed
      const ingredientsArray = value ? value.split(',').map(s => s.trim()).filter(s => s !== '') : [];
      setEditForm({ 
        ...editForm, 
        ingredients: ingredientsArray
      });
    }}
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

                {/* ✅ CUSTOMIZATION OPTIONS SECTION FOR EDIT */}
                <div className={styles.customizationSection}>
                  <div className={styles.sectionHeader}>
                    <h4>Customization Options</h4>
                    <button 
                      className={styles.addCustomizationBtn}
                      onClick={handleAddCustomization}
                    >
                      + Add
                    </button>
                  </div>

                  {customizationOptions.length === 0 ? (
                    <p className={styles.emptyCustomization}>
                      No customization options added yet. Click "+ Add" to create one.
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
                              <CloseIcon width={18} height={18} fill="#4d4d4d"/>
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
                  <button className={styles.deleteBtn} onClick={handleDeleteItem}>
                    Delete
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