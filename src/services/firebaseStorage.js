import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Firebase Data Storage System for 3AM Core Task Management
 * 
 * This class handles all Firebase Firestore operations for the task management system.
 * It provides a centralized way to manage data operations across the application.
 */
class FirebaseStorage {
  constructor() {
    // Collection names
    this.COLLECTIONS = {
      TASKS: 'tasks',
      USERS: 'users'
    };
  }

  /**
   * TASK OPERATIONS
   */

  /**
   * Create a new task
   * @param {Object} taskData - Task data object
   * @param {string} taskData.title - Task title
   * @param {string} taskData.description - Task description
   * @param {string} taskData.date - Task date (YYYY-MM-DD)
   * @param {string} taskData.time - Task time (HH:MM)
   * @param {string} taskData.userId - User ID who created the task
   * @param {string} taskData.username - Username who created the task
   * @returns {Promise<string>} - Returns the created task ID
   */
  async createTask(taskData) {
    try {
      const task = {
        title: taskData.title,
        description: taskData.description || '',
        date: taskData.date,
        time: taskData.time,
        userId: taskData.userId,
        username: taskData.username,
        completed: false,
        createdAt: serverTimestamp(),
        completedAt: null,
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.COLLECTIONS.TASKS), task);
      console.log('Task created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Get all tasks for a specific user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of user tasks
   */
  async getUserTasks(userId) {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.TASKS),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      const tasks = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        tasks.push({
          _id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      // Sort on client side by creation date (newest first)
      tasks.sort((a, b) => b.createdAt - a.createdAt);

      console.log(`Retrieved ${tasks.length} tasks for user ${userId}`);
      return tasks;
    } catch (error) {
      console.error('Error getting user tasks:', error);
      throw error;
    }
  }

  /**
   * Get all tasks from all users (for community view)
   * @returns {Promise<Array>} - Array of all tasks
   */
  async getAllTasks() {
    try {
      const snapshot = await getDocs(collection(db, this.COLLECTIONS.TASKS));
      const tasks = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        tasks.push({
          _id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      // Sort by creation date (newest first)
      tasks.sort((a, b) => b.createdAt - a.createdAt);

      console.log(`Retrieved ${tasks.length} total tasks`);
      return tasks;
    } catch (error) {
      console.error('Error getting all tasks:', error);
      throw error;
    }
  }

  /**
   * Get tasks filtered by date
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} userId - Optional user ID for filtering
   * @returns {Promise<Array>} - Array of tasks for the specified date
   */
  async getTasksByDate(date, userId = null) {
    try {
      let q;
      if (userId) {
        q = query(
          collection(db, this.COLLECTIONS.TASKS),
          where('date', '==', date),
          where('userId', '==', userId)
        );
      } else {
        q = query(
          collection(db, this.COLLECTIONS.TASKS),
          where('date', '==', date)
        );
      }
      
      const snapshot = await getDocs(q);
      const tasks = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        tasks.push({
          _id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      // Sort by time
      tasks.sort((a, b) => a.time.localeCompare(b.time));

      console.log(`Retrieved ${tasks.length} tasks for date ${date}`);
      return tasks;
    } catch (error) {
      console.error('Error getting tasks by date:', error);
      throw error;
    }
  }

  /**
   * Update task completion status
   * @param {string} taskId - Task ID
   * @param {boolean} completed - Completion status
   * @returns {Promise<void>}
   */
  async updateTaskCompletion(taskId, completed) {
    try {
      const taskRef = doc(db, this.COLLECTIONS.TASKS, taskId);
      const updateData = {
        completed,
        updatedAt: serverTimestamp()
      };

      if (completed) {
        updateData.completedAt = serverTimestamp();
      } else {
        updateData.completedAt = null;
      }

      await updateDoc(taskRef, updateData);
      console.log(`Task ${taskId} completion updated to ${completed}`);
    } catch (error) {
      console.error('Error updating task completion:', error);
      throw error;
    }
  }

  /**
   * Update task details
   * @param {string} taskId - Task ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async updateTask(taskId, updateData) {
    try {
      const taskRef = doc(db, this.COLLECTIONS.TASKS, taskId);
      await updateDoc(taskRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      console.log(`Task ${taskId} updated`);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   * @param {string} taskId - Task ID
   * @returns {Promise<void>}
   */
  async deleteTask(taskId) {
    try {
      await deleteDoc(doc(db, this.COLLECTIONS.TASKS, taskId));
      console.log(`Task ${taskId} deleted`);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * USER OPERATIONS
   */

  /**
   * Create or update user profile
   * @param {Object} userData - User data
   * @returns {Promise<void>}
   */
  async createOrUpdateUser(userData) {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userData.userId);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp()
      });
      console.log(`User ${userData.userId} updated`);
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - User data or null if not found
   */
  async getUser(userId) {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
          lastActive: data.lastActive?.toDate() || null
        };
      } else {
        console.log('No user found with ID:', userId);
        return null;
      }
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Get unique dates with task counts for a user
   * @param {string} userId - User ID (optional, if null gets all users' dates)
   * @returns {Promise<Array>} - Array of date objects with counts
   */
  async getTaskDates(userId = null) {
    try {
      let tasks;
      if (userId) {
        tasks = await this.getUserTasks(userId);
      } else {
        tasks = await this.getAllTasks();
      }

      const dateMap = new Map();
      
      tasks.forEach(task => {
        const date = task.date;
        if (dateMap.has(date)) {
          dateMap.set(date, dateMap.get(date) + 1);
        } else {
          dateMap.set(date, 1);
        }
      });

      const dates = Array.from(dateMap.entries()).map(([date, count]) => ({
        date,
        count,
        displayDate: this.formatDisplayDate(date)
      }));

      // Sort dates in descending order (newest first)
      dates.sort((a, b) => b.date.localeCompare(a.date));

      return dates;
    } catch (error) {
      console.error('Error getting task dates:', error);
      throw error;
    }
  }

  /**
   * Get task statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Statistics object
   */
  async getTaskStatistics(userId) {
    try {
      const tasks = await this.getUserTasks(userId);
      
      const stats = {
        total: tasks.length,
        completed: tasks.filter(task => task.completed).length,
        pending: tasks.filter(task => !task.completed).length,
        completionRate: 0
      };

      if (stats.total > 0) {
        stats.completionRate = Math.round((stats.completed / stats.total) * 100);
      }

      return stats;
    } catch (error) {
      console.error('Error getting task statistics:', error);
      throw error;
    }
  }

  /**
   * Listen to real-time updates for user tasks
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function to handle updates
   * @returns {Function} - Unsubscribe function
   */
  listenToUserTasks(userId, callback) {
    const q = query(
      collection(db, this.COLLECTIONS.TASKS),
      where('userId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const tasks = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        tasks.push({
          _id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      // Sort by creation date (newest first)
      tasks.sort((a, b) => b.createdAt - a.createdAt);
      callback(tasks);
    });
  }

  /**
   * Listen to real-time updates for all tasks
   * @param {Function} callback - Callback function to handle updates
   * @returns {Function} - Unsubscribe function
   */
  listenToAllTasks(callback) {
    return onSnapshot(collection(db, this.COLLECTIONS.TASKS), (snapshot) => {
      const tasks = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        tasks.push({
          _id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      // Sort by creation date (newest first)
      tasks.sort((a, b) => b.createdAt - a.createdAt);
      callback(tasks);
    });
  }

  /**
   * Format date for display
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {string} - Formatted date string
   */
  formatDisplayDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  /**
   * Calculate task duration
   * @param {Date} createdAt - Task creation time
   * @param {Date} completedAt - Task completion time
   * @returns {string} - Duration string
   */
  calculateDuration(createdAt, completedAt) {
    if (!completedAt) return '';
    
    const duration = completedAt - createdAt;
    const minutes = Math.floor(duration / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

// Create and export a singleton instance
const firebaseStorage = new FirebaseStorage();
export default firebaseStorage;