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

// State
let currentFilter = 'all';
let todos = [];
let darkMode = localStorage.getItem('darkMode') === 'true';

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
    // Existing event listeners
    addTodoBtn.addEventListener('click', () => {
        // Open modal instead of directly adding
        openAddTaskModal();
    });
    
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            openAddTaskModal();
        }
    });
    
    // New event listeners
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
    
    // Modal event listeners
    cancelTaskBtn.addEventListener('click', closeTaskModal);
    
    saveTaskBtn.addEventListener('click', () => {
        const text = modalTaskInput.value.trim();
        if (text) {
            addTodo(
                text, 
                categoryInput.value, 
                priorityInput.value, 
                dueDateInput.value || null
            );
            closeTaskModal();
        }
    });
}

// Call setup once DOM is loaded
document.addEventListener('DOMContentLoaded', setupEventListeners);

// Open task modal
function openAddTaskModal() {
    modalTaskInput.value = todoInput.value.trim();
    todoInput.value = '';
    categoryInput.value = 'work';
    priorityInput.value = 'medium';
    dueDateInput.value = '';
    taskModal.classList.remove('hidden');
}

// Close task modal
function closeTaskModal() {
    taskModal.classList.add('hidden');
}

// Set active filter and update UI
function setActiveFilter(filter) {
    currentFilter = filter;
    
    // Update UI
    [filterAll, filterActive, filterCompleted].forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    if (filter === 'all') {
        filterAll.classList.remove('bg-gray-200', 'text-gray-700');
        filterAll.classList.add('bg-blue-500', 'text-white');
    } else if (filter === 'active') {
        filterActive.classList.remove('bg-gray-200', 'text-gray-700');
        filterActive.classList.add('bg-blue-500', 'text-white');
    } else {
        filterCompleted.classList.remove('bg-gray-200', 'text-gray-700');
        filterCompleted.classList.add('bg-blue-500', 'text-white');
    }
    
    filterTodos();
}

// Toggle dark mode
function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    
    if (darkMode) {
        document.documentElement.classList.add('dark');
        darkModeToggle.textContent = '☀️'; // Sun icon for light mode toggle
        console.log("Dark mode enabled");
    } else {
        document.documentElement.classList.remove('dark');
        darkModeToggle.textContent = '🌙'; // Moon icon for dark mode toggle
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
                    snapshot.docs.forEach(doc => {
                        renderTodo({
                            id: doc.id,
                            data: () => doc.data()
                        });
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

// Filter todos based on search input and current filter
function filterTodos() {
    // Clear the list first
    todoList.innerHTML = '';
    
    const searchTerm = searchInput.value.toLowerCase();
    
    // Filter todos based on current filter and search term
    const filteredTodos = todos.filter(todo => {
        const matchesSearch = todo.text.toLowerCase().includes(searchTerm);
        
        if (currentFilter === 'all') {
            return matchesSearch;
        } else if (currentFilter === 'active') {
            return !todo.completed && matchesSearch;
        } else { // completed
            return todo.completed && matchesSearch;
        }
    });
    
    // Render the filtered todos
    filteredTodos.forEach(todo => {
        // Create a wrapper object that mimics a DocumentSnapshot
        renderTodo({
            id: todo.id,
            data: () => todo
        });
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
function renderTodo(docSnapshot) {
    try {
        const todoData = docSnapshot.data();
        const todoId = docSnapshot.id;
        
        console.log("Rendering todo data:", todoData);
        console.log("Rendering todo ID:", todoId);
        
        const li = document.createElement('li');
        li.id = todoId;
        li.className = 'flex items-center justify-between p-3 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white';
        
        // Add priority color indicator
        if (todoData.priority === 'high') {
            li.classList.add('border-l-4', 'border-l-red-500');
        } else if (todoData.priority === 'medium') {
            li.classList.add('border-l-4', 'border-l-yellow-500');
        } else {
            li.classList.add('border-l-4', 'border-l-green-500');
        }
        
        // Create the left part with checkbox and text
        const leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center space-x-2 flex-grow';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-checkbox h-5 w-5 text-blue-500';
        checkbox.checked = todoData.completed;
        checkbox.addEventListener('change', () => toggleComplete(todoId, !todoData.completed));
        
        const textDiv = document.createElement('div');
        textDiv.className = 'flex flex-col';
        
        const span = document.createElement('span');
        span.textContent = todoData.text;
        span.className = todoData.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'dark:text-white';
        
        // Add metadata
        const metaDiv = document.createElement('div');
        metaDiv.className = 'flex space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1';
        
        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'px-2 py-0.5 bg-gray-200 dark:bg-gray-500 rounded-full';
        categoryBadge.textContent = todoData.category || 'other';
        metaDiv.appendChild(categoryBadge);
        
        if (todoData.dueDate) {
            const dueDateBadge = document.createElement('span');
            dueDateBadge.className = 'px-2 py-0.5 bg-gray-200 rounded-full';
            
            // Format the date
            const dueDate = new Date(todoData.dueDate);
            const now = new Date();
            const isOverdue = dueDate < now && !todoData.completed;
            
            if (isOverdue) {
                dueDateBadge.classList.add('bg-red-200', 'text-red-800');
            }
            
            dueDateBadge.textContent = `Due: ${dueDate.toLocaleDateString()}`;
            metaDiv.appendChild(dueDateBadge);
        }
        
        textDiv.appendChild(span);
        textDiv.appendChild(metaDiv);
        
        leftDiv.appendChild(checkbox);
        leftDiv.appendChild(textDiv);
        
        // Create the right part with edit and delete buttons
        const rightDiv = document.createElement('div');
        rightDiv.className = 'flex space-x-2';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'text-blue-500 hover:text-blue-700';
        editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>';
        editBtn.addEventListener('click', () => editTodo(todoId, todoData));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-500 hover:text-red-700';
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 102 0V8a1 1 00-1-1z" clip-rule="evenodd" /></svg>';
        deleteBtn.addEventListener('click', () => deleteTodo(todoId));
        
        rightDiv.appendChild(editBtn);
        rightDiv.appendChild(deleteBtn);
        
        // Add all parts to the list item
        li.appendChild(leftDiv);
        li.appendChild(rightDiv);
        
        // Add the list item to the todo list
        todoList.appendChild(li);
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
async function editTodo(id, todoData) {
    // Populate the modal with existing data
    modalTaskInput.value = todoData.text;
    categoryInput.value = todoData.category || 'other';
    priorityInput.value = todoData.priority || 'medium';
    dueDateInput.value = todoData.dueDate || '';
    
    // Show the modal
    taskModal.classList.remove('hidden');
    
    // Override the save button to update instead of create
    const originalClickHandler = saveTaskBtn.onclick;
    
    saveTaskBtn.onclick = async () => {
        const newText = modalTaskInput.value.trim();
        
        if (newText) {
            try {
                await updateDoc(doc(db, 'todos', id), {
                    text: newText,
                    category: categoryInput.value,
                    priority: priorityInput.value,
                    dueDate: dueDateInput.value || null
                });
                console.log("Todo edited:", id);
                closeTaskModal();
                
                // Restore original click handler
                saveTaskBtn.onclick = originalClickHandler;
            } catch (error) {
                console.error('Error updating todo: ', error);
                debugInfo.textContent = "Error updating todo: " + error.message;
            }
        }
    };
    
    // Make sure cancel restores the original handler
    const originalCancelHandler = cancelTaskBtn.onclick;
    cancelTaskBtn.onclick = () => {
        closeTaskModal();
        saveTaskBtn.onclick = originalClickHandler;
        cancelTaskBtn.onclick = originalCancelHandler;
    };
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
