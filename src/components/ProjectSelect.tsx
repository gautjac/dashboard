import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  projects: string[];
  placeholder?: string;
  className?: string;
}

// Generate a consistent color for a project name
function getProjectColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
    'bg-rose-100 text-rose-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function ProjectSelect({
  value,
  onChange,
  projects,
  placeholder = 'Project (optional)',
  className = '',
}: ProjectSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter projects based on input
  const filteredProjects = projects.filter(
    p => p.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Show suggestion for new project if input doesn't match any existing
  const showNewProjectOption = inputValue.trim() &&
    !projects.some(p => p.toLowerCase() === inputValue.toLowerCase());

  // Calculate dropdown position when opening
  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 200; // approximate max height

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        // Position above
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: rect.width,
        });
      } else {
        // Position below
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => updateDropdownPosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen]);

  // Update input when value changes externally
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleSelect = (project: string | null) => {
    onChange(project);
    setInputValue(project || '');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay to allow click on dropdown
    setTimeout(() => {
      const trimmed = inputValue.trim();
      if (trimmed) {
        onChange(trimmed);
      } else {
        onChange(null);
        setInputValue('');
      }
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed) {
        handleSelect(trimmed);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          style={dropdownStyle}
          className="z-[9999] py-1 bg-paper rounded-lg shadow-lg border border-warm-gray max-h-48 overflow-y-auto"
        >
          {showNewProjectOption && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(inputValue.trim());
              }}
              className="w-full px-3 py-2 text-left text-sm font-ui hover:bg-warm-gray/50 flex items-center gap-2"
            >
              <span className="text-terracotta">+</span>
              Create "{inputValue.trim()}"
            </button>
          )}
          {filteredProjects.length > 0 ? (
            filteredProjects.map(project => (
              <button
                key={project}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(project);
                }}
                className="w-full px-3 py-2 text-left text-sm font-ui hover:bg-warm-gray/50 flex items-center gap-2"
              >
                <span className={`px-2 py-0.5 rounded-full text-xs ${getProjectColor(project)}`}>
                  {project}
                </span>
              </button>
            ))
          ) : !showNewProjectOption && (
            <div className="px-3 py-2 text-sm font-ui text-ink-muted">
              {projects.length === 0
                ? "Type to create a new project"
                : "No matching projects"}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            updateDropdownPosition();
            setIsOpen(true);
          }}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 text-sm font-ui bg-warm-gray/30 border border-warm-gray rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta
                     placeholder:text-ink-muted"
        />
        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(null);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-warm-gray rounded"
          >
            <X className="w-3 h-3 text-ink-muted" />
          </button>
        ) : (
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
        )}
      </div>

      {createPortal(dropdownContent, document.body)}
    </div>
  );
}

// Export the color function for use in other components
export { getProjectColor };
