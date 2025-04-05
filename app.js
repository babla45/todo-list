// DOM Elements
const todoInput = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoList = document.getElementById('todoList');
const searchInput = document.getElementById('searchInput');
const filterAll = document.getElementById('filterAll');
const filterActive = document.getElementById('filterActive');
const filterCompleted = document.getElementById('filterCompleted');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const taskCount = document.getElementById('taskCount');
const completedCount = document.getElementById('completedCount');
const darkModeToggle = document.getElementById('darkModeToggle');
const taskModal = document.getElementById('taskModal');
const modalTaskInput = document.getElementById('modalTaskInput');
const categoryInput = document.getElementById('categoryInput');
const priorityInput = document.getElementById('priorityInput');
const dueDateInput = document.getElementById('dueDateInput');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');
const debugInfo = document.getElementById('debugInfo');
const searchModeToggle = document.getElementById('searchModeToggle');

// State
let currentFilter = 'all';
let todos = [];
let darkMode = localStorage.getItem('darkMode') === 'true';

// Global variables to track edit state
let isEditing = false;
let editingTodoId = null;

// Add a new variable for search mode
let searchBySubsequence = false;

// Load todos when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Apply dark mode if previously set
    if (darkMode) {
        document.documentElement.classList.add('dark');
        if (darkModeToggle) darkModeToggle.textContent = '☀️';
        console.log("Dark mode enabled on load");
    } else {
        document.documentElement.classList.remove('dark');
        if (darkModeToggle) darkModeToggle.textContent = '🌙';
        console.log("Dark mode disabled on load");
    }
    
    // Wait a short time to ensure Firebase initialization is complete
    setTimeout(() => {
        if (window.db) {
            loadTodos();
            console.log("Loading todos...");
            debugInfo.textContent = "Loading todos from Firebase...";
        } else {
            console.error("Firebase DB not available");
            debugInfo.textContent = "Error: Firebase DB not available";
        }
    }, 1000);
});

// Setup event listeners
function setupEventListeners() {
    // Modal event listeners
    cancelTaskBtn.addEventListener('click', () => {
        // Reset edit state
        isEditing = false;
        editingTodoId = null;
        closeTaskModal();
    });
    
    document.getElementById('closeModalBtn')?.addEventListener('click', () => {
        // Reset edit state
        isEditing = false;
        editingTodoId = null;
        closeTaskModal();
    });
    
    saveTaskBtn.addEventListener('click', async () => {
        const text = modalTaskInput.value.trim();
        if (!text) return;
        
        if (isEditing && editingTodoId) {
            // Update existing todo
            try {
                await updateDoc(doc(db, 'todos', editingTodoId), {
                    text: text,
                    category: categoryInput.value,
                    priority: priorityInput.value,
                    dueDate: dueDateInput.value || null
                });
                console.log("Todo updated:", editingTodoId);
                debugInfo.textContent = "Todo updated successfully";
                
                // Reset edit state
                isEditing = false;
                editingTodoId = null;
                closeTaskModal();
            } catch (error) {
                console.error('Error updating todo:', error);
                debugInfo.textContent = "Error updating todo: " + error.message;
            }
        } else {
            // Create new todo
            await addTodo(
                text, 
                categoryInput.value, 
                priorityInput.value, 
                dueDateInput.value || null
            );
            closeTaskModal();
        }
    });
    
    // Other event listeners remain the same
    addTodoBtn.addEventListener('click', openAddTaskModal);
    
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            openAddTaskModal();
        }
    });
    
    searchInput.addEventListener('input', filterTodos);
    
    filterAll.addEventListener('click', () => {
        setActiveFilter('all');
    });
    
    filterActive.addEventListener('click', () => {
        setActiveFilter('active');
    });
    
    filterCompleted.addEventListener('click', () => {
        setActiveFilter('completed');
    });
    
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    searchModeToggle.addEventListener('change', () => {
        searchBySubsequence = searchModeToggle.checked;
        filterTodos(); // Re-filter todos with the new search mode
    });
}

// Call setup once DOM is loaded
document.addEventListener('DOMContentLoaded', setupEventListeners);

// Open task modal for creating a new task
function openAddTaskModal() {
    // Reset edit state
    isEditing = false;
    editingTodoId = null;
    
    // Set default values
    modalTaskInput.value = todoInput.value.trim();
    todoInput.value = '';
    categoryInput.value = 'work';
    priorityInput.value = 'medium';
    dueDateInput.value = '';
    
    // Show the modal
    taskModal.classList.remove('hidden');
}

// Close task modal
function closeTaskModal() {
    taskModal.classList.add('hidden');
}

// Set active filter and update UI
function setActiveFilter(filter) {
    currentFilter = filter;
    
    // Update UI for both light and dark mode
    [filterAll, filterActive, filterCompleted].forEach(btn => {
        btn.classList.remove('bg-primary-base', 'text-white');
        btn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    });
    
    if (filter === 'all') {
        filterAll.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
        filterAll.classList.add('bg-primary-base', 'text-white');
    } else if (filter === 'active') {
        filterActive.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
        filterActive.classList.add('bg-primary-base', 'text-white');
    } else { // completed
        filterCompleted.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
        filterCompleted.classList.add('bg-primary-base', 'text-white');
    }
    
    filterTodos();
}

// Toggle dark mode
function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    
    if (darkMode) {
        document.documentElement.classList.add('dark');
        darkModeToggle.textContent = '☀️'; 
        console.log("Dark mode enabled");
    } else {
        document.documentElement.classList.remove('dark');
        darkModeToggle.textContent = '🌙';
        console.log("Dark mode disabled");
    }
}

// Add todo to Firestore
async function addTodo(text, category, priority, dueDate) {
    try {
        const docRef = await addDoc(collection(db, 'todos'), {
            text: text,
            completed: false,
            createdAt: serverTimestamp(),
            category: category || 'other',
            priority: priority || 'medium',
            dueDate: dueDate || null
        });
        console.log("Todo added with ID: ", docRef.id);
        debugInfo.textContent = "Todo added successfully";
    } catch (error) {
        console.error('Error adding todo: ', error);
        debugInfo.textContent = "Error adding todo: " + error.message;
    }
}

// Load todos from Firestore
function loadTodos() {
    // Clear the list first
    todoList.innerHTML = '';
    
    try {
        // Set up a real-time listener
        const todosQuery = query(collection(db, 'todos'), orderBy('createdAt', 'desc'));
        
        onSnapshot(todosQuery, (snapshot) => {
            console.log("Snapshot received, document count:", snapshot.docs.length);
            debugInfo.textContent = `Found ${snapshot.docs.length} todos`;
            
            // Store all todos in our array for filtering
            todos = snapshot.docs.map(doc => {
                const data = doc.data();
                console.log("Todo data:", doc.id, data);
                return {
                    id: doc.id,
                    ...data
                };
            });
            
            console.log("Processed todos array:", todos);
            
            // Update statistics
            updateStatistics();
            
            // Apply current filter
            filterTodos();
            
            // Additional check
            setTimeout(() => {
                if (todoList.children.length === 0) {
                    console.log("todoList is still empty after processing");
                    // Try direct rendering as fallback
                    snapshot.docs.forEach((doc, index) => {
                        renderTodo({
                            id: doc.id,
                            data: () => doc.data()
                        }, index);
                    });
                }
            }, 500);
        }, error => {
            console.error("Error getting todos:", error);
            debugInfo.textContent = "Error getting todos: " + error.message;
        });
    } catch (error) {
        console.error("Error setting up todo listener:", error);
        debugInfo.textContent = "Error setting up listener: " + error.message;
    }
}

// Add this function to check if a string contains a subsequence
function isSubsequence(str, subseq) {
    if (subseq.length === 0) return true;
    
    let strIndex = 0;
    let subseqIndex = 0;
    
    while (strIndex < str.length && subseqIndex < subseq.length) {
        if (str[strIndex].toLowerCase() === subseq[subseqIndex].toLowerCase()) {
            subseqIndex++;
        }
        strIndex++;
    }
    
    return subseqIndex === subseq.length;
}

// Update the filterTodos function
function filterTodos() {
    // Clear the list first
    todoList.innerHTML = '';
    
    const searchTerm = searchInput.value.toLowerCase();
    
    // Filter todos based on current filter and search term
    const filteredTodos = todos.filter(todo => {
        // Different search methods
        let matchesSearch;
        if (searchBySubsequence) {
            matchesSearch = isSubsequence(todo.text.toLowerCase(), searchTerm);
        } else {
            matchesSearch = todo.text.toLowerCase().includes(searchTerm);
        }
        
        if (currentFilter === 'all') {
            return matchesSearch;
        } else if (currentFilter === 'active') {
            return !todo.completed && matchesSearch;
        } else { // completed
            return todo.completed && matchesSearch;
        }
    });
    
    // Render the filtered todos with index
    filteredTodos.forEach((todo, index) => {
        // Create a wrapper object that mimics a DocumentSnapshot
        renderTodo({
            id: todo.id,
            data: () => todo
        }, index);
    });
    
    // Update statistics
    updateStatistics();
}

// Update task statistics
function updateStatistics() {
    const totalTasks = todos.length;
    const completedTasks = todos.filter(todo => todo.completed).length;
    
    taskCount.textContent = `${totalTasks} tasks total`;
    completedCount.textContent = `${completedTasks} completed`;
}

// Clear completed tasks
async function clearCompletedTasks() {
    if (confirm('Are you sure you want to delete all completed tasks?')) {
        const completedTodos = todos.filter(todo => todo.completed);
        
        for (const todo of completedTodos) {
            try {
                await deleteDoc(doc(db, 'todos', todo.id));
            } catch (error) {
                console.error('Error deleting todo: ', error);
            }
        }
    }
}

// Render a todo item in the UI
function renderTodo(docSnapshot, index) {
    try {
        const todoData = docSnapshot.data();
        const todoId = docSnapshot.id;
        
        console.log("Rendering todo data:", todoData);
        console.log("Rendering todo ID:", todoId);
        
        const li = document.createElement('li');
        li.id = todoId;
        li.className = 'p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm task-enter task-enter-active';
        
        // Create the main flex container
        const mainContainer = document.createElement('div');
        mainContainer.className = 'flex items-center justify-between';
        
        // Create the left part with index, checkbox and text
        const leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center gap-3';
        
        // Add index number
        const indexSpan = document.createElement('span');
        indexSpan.textContent = `${index + 1}.`;
        indexSpan.className = 'text-gray-500 dark:text-gray-400 font-medium min-w-[20px]';
        
        // Create simple checkbox to match the screenshot
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'h-5 w-5 rounded-full border-gray-300 text-primary-base focus:ring-primary-base';
        checkbox.checked = todoData.completed;
        checkbox.addEventListener('change', () => toggleComplete(todoId, !todoData.completed));
        
        const textDiv = document.createElement('div');
        
        const span = document.createElement('span');
        span.textContent = todoData.text;
        span.className = todoData.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'dark:text-white';
        
        textDiv.appendChild(span);
        
        leftDiv.appendChild(indexSpan);
        leftDiv.appendChild(checkbox);
        leftDiv.appendChild(textDiv);
        
        // Create the right part with metadata and actions
        const rightDiv = document.createElement('div');
        rightDiv.className = 'flex items-center gap-2';
        
        // Add priority indicator
        let priorityColor = 'bg-green-500';
        if (todoData.priority === 'high') {
            priorityColor = 'bg-red-500';
        } else if (todoData.priority === 'medium') {
            priorityColor = 'bg-yellow-500';
        }
        
        const priorityDot = document.createElement('span');
        priorityDot.className = `h-2 w-2 rounded-full ${priorityColor}`;
        
        // Add category badge
        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'text-xs text-gray-600 dark:text-gray-400';
        categoryBadge.textContent = todoData.category || 'other';
        
        // Add date if present
        if (todoData.dueDate) {
            const dueDateSpan = document.createElement('span');
            dueDateSpan.className = 'flex items-center gap-1 text-xs text-gray-600';
            
            const calendarIcon = document.createElement('span');
            calendarIcon.innerHTML = `<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
            </svg>`;
            
            const date = new Date(todoData.dueDate);
            const dateText = document.createTextNode(date.toLocaleDateString('en-US', {month: 'numeric', day: 'numeric', year: 'numeric'}));
            
            dueDateSpan.appendChild(calendarIcon);
            dueDateSpan.appendChild(dateText);
            rightDiv.appendChild(dueDateSpan);
        }
        
        // Add edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'text-blue-600 p-1.5';
        editBtn.innerHTML = '<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>';
        editBtn.addEventListener('click', () => editTodo(todoId, todoData));
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-600 p-1.5';
        deleteBtn.innerHTML = '<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 102 0V8a1 1 00-1-1z" clip-rule="evenodd" /></svg>';
        deleteBtn.addEventListener('click', () => deleteTodo(todoId));
        
        // Add all elements to the right side in this order
        rightDiv.appendChild(priorityDot);
        rightDiv.appendChild(categoryBadge);
        // Due date is added conditionally above
        rightDiv.appendChild(editBtn);
        rightDiv.appendChild(deleteBtn);
        
        // Add the main parts to the container
        mainContainer.appendChild(leftDiv);
        mainContainer.appendChild(rightDiv);
        
        // Add the main container to the list item
        li.appendChild(mainContainer);
        
        // Add the list item to the todo list
        todoList.appendChild(li);
        
        // Show animation
        setTimeout(() => {
            li.classList.remove('task-enter');
        }, 10);
    } catch (error) {
        console.error("Error rendering todo:", error);
        debugInfo.textContent = "Error rendering todo: " + error.message;
    }
}

// Toggle todo completion status
async function toggleComplete(id, completed) {
    try {
        await updateDoc(doc(db, 'todos', id), {
            completed: completed
        });
        console.log("Todo completion toggled:", id, completed);
    } catch (error) {
        console.error('Error updating todo: ', error);
        debugInfo.textContent = "Error updating todo: " + error.message;
    }
}

// Edit a todo
function editTodo(id, todoData) {
    // Set global edit state
    isEditing = true;
    editingTodoId = id;
    
    // Populate the modal with existing data
    modalTaskInput.value = todoData.text;
    categoryInput.value = todoData.category || 'other';
    priorityInput.value = todoData.priority || 'medium';
    dueDateInput.value = todoData.dueDate || '';
    
    // Show the modal
    taskModal.classList.remove('hidden');
    
    // We'll rely on the save button's click handler to check isEditing
}

// Delete a todo
async function deleteTodo(id) {
    if (confirm('Are you sure you want to delete this todo?')) {
        try {
            await deleteDoc(doc(db, 'todos', id));
            console.log("Todo deleted:", id);
        } catch (error) {
            console.error('Error deleting todo: ', error);
            debugInfo.textContent = "Error deleting todo: " + error.message;
        }
    }
}
