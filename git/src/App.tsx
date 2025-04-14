import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { formatDistanceToNow } from 'date-fns';
import { Bot, Code2, Github, Search, Sparkles, Terminal, TrendingUp, Zap, BookCopy as BookCode, BrainCircuit, Filter, Star, GitFork, Clock, Settings, X, Upload, Save } from 'lucide-react';
import { cn } from './utils';
import { getTrendingRepos, fetchAllTrendingRepos, searchRepos, searchCode, type GitHubRepo } from './api/github';

type SearchMode = 'trending' | 'simple' | 'agent' | 'code';

// Rename the local interface to avoid conflict with the imported one
interface SearchParameters {
  language: string;
  timeframe: string;
  sortBy: string;
  topic: string;
  minStars: string;
  projectType: string;
  customProjectType: string;
  fileType: string;
  searchScope: string;
  codeLanguage: string;
  searchIn: string;
  extension: string;
  orgFilter: string;
  loadAll: boolean;
  contextMode?: 'file' | 'project' | 'domain' | 'similar-stack';
  continuousSearch?: boolean;
}

interface ApiKeys {
  github: string;
  anthropic: string;
  openai?: string;
}

interface UploadedFile {
  name: string;
  content: string;
  type: string;
}

interface CodeContextItem {
  fileName: string;
  patterns: string[];
  imports: string[];
  fileType: string;
}

function App() {
  const [searchMode, setSearchMode] = useState<SearchMode>('trending');
  const [query, setQuery] = useState('');
  const [searchParams, setSearchParams] = useState<SearchParameters>({
    language: 'any',
    timeframe: 'week',
    sortBy: 'stars',
    topic: 'all',
    minStars: '0',
    projectType: 'all',
    customProjectType: '',
    fileType: 'any',
    searchScope: 'all',
    codeLanguage: 'any',
    searchIn: 'file',
    extension: 'any',
    orgFilter: '',
    loadAll: true, // Default to showing all results
    contextMode: 'project',
    continuousSearch: false
  });
  
  // Add state for API keys and settings modal
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    github: import.meta.env.VITE_GITHUB_TOKEN || '',
    anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
    openai: import.meta.env.VITE_OPENAI_API_KEY || ''
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [focusPoint, setFocusPoint] = useState('');
  const [contextDescription, setContextDescription] = useState('');
  
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const result = reader.result;
        if (result && typeof result === 'string') {
          setUploadedFiles(prev => [
            ...prev,
            {
              name: file.name,
              content: result,
              type: file.type
            }
          ]);
        }
      };
      reader.readAsText(file);
    });
  };

  // Save API keys to local storage
  const saveApiKeys = () => {
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
    setShowSettingsModal(false);
  };

  // Load API keys from local storage
  useEffect(() => {
    const savedKeys = localStorage.getItem('apiKeys');
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys));
      } catch (e) {
        console.error('Error parsing saved API keys', e);
      }
    }
  }, []);

  const { data: results, isLoading, error } = useQuery(
    ['repos', searchMode, searchParams, query, uploadedFiles, focusPoint],
    async () => {
      switch (searchMode) {
        case 'trending':
          return fetchAllTrendingRepos(searchParams); // Always fetch all results
        case 'simple':
          return searchRepos({ ...searchParams, query, loadAll: true });
        case 'code':
          return searchCode({ ...searchParams, query, loadAll: true });
        case 'agent':
          // For agent search, with enhanced context understanding
          const enhancedQuery = focusPoint ? `${query} ${focusPoint}` : query;
          const projectTypeQuery = searchParams.customProjectType || searchParams.projectType;
          
          // If we have uploaded files, analyze them for context
          let codeContext: CodeContextItem[] = [];
          if (uploadedFiles.length > 0) {
            codeContext = await analyzeCodeContext(uploadedFiles);
          }
          
          return Promise.all([
            searchRepos({ 
              ...searchParams, 
              query: enhancedQuery,
              projectType: projectTypeQuery,
              loadAll: true // Always fetch all results
            }),
            searchCode({ 
              ...searchParams, 
              query: enhancedQuery,
              loadAll: true // Always fetch all results
            })
          ]).then(([repos, code]) => {
            // Enhanced relevance scoring with code context
            return repos.map(repo => ({
              ...repo,
              matchScore: calculateRelevanceScore(repo, code, codeContext),
              relevanceScore: calculateCodeQuality(repo),
              contextScore: codeContext.length > 0 ? calculateContextMatch(repo, codeContext) : undefined
            }));
          });
        default:
          return Promise.resolve([]);
      }
    },
    {
      enabled: searchMode === 'trending' || (query.length > 0),
      staleTime: 60000,
    }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // No need to reset visible results count anymore
    // React Query will automatically refetch when query changes
  };

  // Simulate code context analysis
  const analyzeCodeContext = async (files: UploadedFile[]): Promise<CodeContextItem[]> => {
    // This would be replaced with actual code analysis using LLMs
    return files.map(file => ({
      fileName: file.name,
      patterns: ['useEffect', 'useState', 'useRef'].filter(pattern => 
        file.content.includes(pattern)
      ),
      imports: file.content.match(/import\s+.*\s+from\s+['"].*['"]/g) || [],
      fileType: file.type
    }));
  };

  // Enhanced relevance score calculation with code context
  const calculateContextMatch = (repo: GitHubRepo, codeContext: CodeContextItem[]): number => {
    // Simplified implementation - would be more sophisticated with actual LLM
    return Math.min(100, 50 + Math.random() * 50);
  };

  const SearchModeButton = ({ mode, icon: Icon, label }: { mode: SearchMode; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => setSearchMode(mode)}
      className={cn(
        "flex items-center px-4 py-2 rounded-lg transition-colors",
        searchMode === mode ? "bg-blue-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
      )}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </button>
  );

  const renderParameters = () => {
    const commonClasses = "w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-gray-200";
    
    switch (searchMode) {
      case 'trending':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Language</label>
              <select
                value={searchParams.language}
                onChange={(e) => setSearchParams({ ...searchParams, language: e.target.value })}
                className={commonClasses}
              >
                <option value="any">Any</option>
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
                <option value="java">Java</option>
                <option value="kotlin">Kotlin</option>
                <option value="swift">Swift</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Time Period</label>
              <select
                value={searchParams.timeframe}
                onChange={(e) => setSearchParams({ ...searchParams, timeframe: e.target.value })}
                className={commonClasses}
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Sort By</label>
              <select
                value={searchParams.sortBy}
                onChange={(e) => setSearchParams({ ...searchParams, sortBy: e.target.value })}
                className={commonClasses}
              >
                <option value="stars">Stars</option>
                <option value="forks">Forks</option>
                <option value="updated">Recently Updated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Topic</label>
              <select
                value={searchParams.topic}
                onChange={(e) => setSearchParams({ ...searchParams, topic: e.target.value })}
                className={commonClasses}
              >
                <option value="all">All Topics</option>
                <option value="web">Web Development</option>
                <option value="ai">AI/ML</option>
                <option value="mobile">Mobile</option>
                <option value="tools">Developer Tools</option>
                <option value="database">Databases</option>
                <option value="security">Security</option>
                <option value="blockchain">Blockchain</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Minimum Stars</label>
              <select
                value={searchParams.minStars}
                onChange={(e) => setSearchParams({ ...searchParams, minStars: e.target.value })}
                className={commonClasses}
              >
                <option value="0">Any</option>
                <option value="100">100+</option>
                <option value="1000">1,000+</option>
                <option value="10000">10,000+</option>
                <option value="50000">50,000+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Organization</label>
              <input
                type="text"
                value={searchParams.orgFilter}
                onChange={(e) => setSearchParams({ ...searchParams, orgFilter: e.target.value })}
                placeholder="e.g. microsoft, google"
                className={commonClasses}
              />
            </div>
          </div>
        );
      
      case 'simple':
        return (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Topic</label>
              <select
                value={searchParams.topic}
                onChange={(e) => setSearchParams({ ...searchParams, topic: e.target.value })}
                className={commonClasses}
              >
                <option value="all">All Topics</option>
                <option value="web">Web Development</option>
                <option value="ai">AI/ML</option>
                <option value="mobile">Mobile</option>
                <option value="tools">Developer Tools</option>
                <option value="database">Databases</option>
                <option value="security">Security</option>
                <option value="blockchain">Blockchain</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Minimum Stars</label>
              <select
                value={searchParams.minStars}
                onChange={(e) => setSearchParams({ ...searchParams, minStars: e.target.value })}
                className={commonClasses}
              >
                <option value="0">Any</option>
                <option value="100">100+</option>
                <option value="1000">1,000+</option>
                <option value="10000">10,000+</option>
                <option value="50000">50,000+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Language</label>
              <select
                value={searchParams.language}
                onChange={(e) => setSearchParams({ ...searchParams, language: e.target.value })}
                className={commonClasses}
              >
                <option value="any">Any</option>
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
              </select>
            </div>
          </div>
        );
      
      case 'agent':
        return (
          <div className="space-y-6">
            {/* Main parameters grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Project Type</label>
                <div className="flex space-x-2">
                  <select
                    value={searchParams.projectType}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setSearchParams({ 
                        ...searchParams, 
                        projectType: newValue,
                        customProjectType: newValue === 'custom' ? searchParams.customProjectType : ''
                      });
                    }}
                    className={`${commonClasses} ${searchParams.projectType === 'custom' ? 'w-1/3' : 'w-full'}`}
                  >
                    <option value="all">All Types</option>
                    <option value="library">Library/Framework</option>
                    <option value="application">Application</option>
                    <option value="tool">Developer Tool</option>
                    <option value="starter">Starter Template</option>
                    <option value="custom">Custom...</option>
                  </select>
                  
                  {searchParams.projectType === 'custom' && (
                    <input
                      type="text"
                      value={searchParams.customProjectType}
                      onChange={(e) => setSearchParams({ ...searchParams, customProjectType: e.target.value })}
                      placeholder="Specify project type..."
                      className={`${commonClasses} w-2/3`}
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Context Mode</label>
                <select
                  value={searchParams.contextMode}
                  onChange={(e) => setSearchParams({ ...searchParams, contextMode: e.target.value as any })}
                  className={commonClasses}
                >
                  <option value="file">File Level</option>
                  <option value="project">Project Level</option>
                  <option value="domain">Domain Level</option>
                  <option value="similar-stack">Similar Tech Stack</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Language</label>
                <select
                  value={searchParams.language}
                  onChange={(e) => setSearchParams({ ...searchParams, language: e.target.value })}
                  className={commonClasses}
                >
                  <option value="any">Any</option>
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="rust">Rust</option>
                  <option value="go">Go</option>
                  <option value="java">Java</option>
                </select>
              </div>
            </div>

            {/* File Upload and Focus Point */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Focus Point</label>
                <input
                  type="text"
                  value={focusPoint}
                  onChange={(e) => setFocusPoint(e.target.value)}
                  placeholder="e.g., Find advanced web context retrieval code"
                  className={commonClasses}
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Context Description</label>
                <textarea
                  value={contextDescription}
                  onChange={(e) => setContextDescription(e.target.value)}
                  placeholder="e.g., RAG Browser - building a retrieval augmented search tool"
                  className={`${commonClasses} h-20 resize-none`}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Context Files ({uploadedFiles.length})
                </label>
                <div className="flex items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors mr-2"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </button>
                  
                  {uploadedFiles.length > 0 && (
                    <button
                      onClick={() => setUploadedFiles([])}
                      className="flex items-center bg-gray-800 hover:bg-red-900 text-gray-300 px-4 py-2 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Files
                    </button>
                  )}
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 max-h-20 overflow-y-auto">
                    <ul className="text-xs text-gray-400 space-y-1">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="flex items-center">
                          <Code2 className="w-3 h-3 mr-1 text-blue-400" />
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Continuous Search toggle */}
            <div className="mt-2">
              <label className="inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={searchParams.continuousSearch}
                  onChange={(e) => setSearchParams({ ...searchParams, continuousSearch: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-300">Continuous search until stopped</span>
              </label>
            </div>

            {/* Settings button */}
            <div className="flex justify-end">
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                API Settings
              </button>
            </div>
          </div>
        );
      
      case 'code':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Language</label>
              <select
                value={searchParams.codeLanguage}
                onChange={(e) => setSearchParams({ ...searchParams, codeLanguage: e.target.value })}
                className={commonClasses}
              >
                <option value="any">Any</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Search In</label>
              <select
                value={searchParams.searchIn}
                onChange={(e) => setSearchParams({ ...searchParams, searchIn: e.target.value })}
                className={commonClasses}
              >
                <option value="file">File Contents</option>
                <option value="path">File Path</option>
                <option value="function">Function Names</option>
                <option value="class">Class Names</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">File Extension</label>
              <select
                value={searchParams.extension}
                onChange={(e) => setSearchParams({ ...searchParams, extension: e.target.value })}
                className={commonClasses}
              >
                <option value="any">Any</option>
                <option value=".js">.js</option>
                <option value=".ts">.ts</option>
                <option value=".py">.py</option>
                <option value=".java">.java</option>
                <option value=".go">.go</option>
                <option value=".rs">.rs</option>
                <option value=".cpp">.cpp</option>
                <option value=".cs">.cs</option>
                <option value=".php">.php</option>
                <option value=".rb">.rb</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Sort By</label>
              <select
                value={searchParams.sortBy}
                onChange={(e) => setSearchParams({ ...searchParams, sortBy: e.target.value })}
                className={commonClasses}
              >
                <option value="best-match">Best Match</option>
                <option value="recently-indexed">Recently Indexed</option>
                <option value="recently-updated">Recently Updated</option>
              </select>
            </div>
          </div>
        );
    }
  };

  const renderResults = () => {
    if (error) {
      return (
        <div className="text-center text-red-500 py-8">
          Error loading results. Please try again later.
        </div>
      );
    }

    if (!results?.length) {
      return (
        <div className="text-center text-gray-400 py-8">
          No results found. Try adjusting your search criteria.
        </div>
      );
    }

    // Always show all results instead of paginating
    const displayedResults = results;
    
    const resultsContent = searchMode === 'code' ? renderCodeResults(displayedResults) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
        {displayedResults.map((result: GitHubRepo & { matchScore?: number; relevanceScore?: number }) => (
          <div
            key={result.id}
            className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-3 hover:border-blue-500 transition-all duration-300 flex flex-col h-full"
          >
            <div className="flex items-center gap-2 mb-2">
              {result.owner && (
                <img
                  src={result.owner.avatar_url}
                  alt={result.owner.login}
                  className="w-8 h-8 rounded-md flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-medium truncate">
                  <a
                    href={result.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 transition-colors"
                  >
                    {result.name}
                  </a>
                </h3>
                <p className="text-xs text-gray-400 truncate">{result.owner?.login}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-2 line-clamp-2 flex-1 min-h-[2em]">
              {result.description}
            </p>

            <div className="flex items-center justify-between text-xs mt-auto">
              <div className="flex items-center gap-2">
                {result.language && (
                  <div className="flex items-center">
                    <Code2 className="w-3 h-3 text-blue-500 mr-1" />
                    <span className="text-gray-400">{result.language}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-500 mr-1" />
                  <span className="text-gray-400">
                    {result.stargazers_count.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );

    return (
      <>
        <div className="text-sm text-gray-400 mb-4">
          Showing {displayedResults.length} results
        </div>
        {resultsContent}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(50,50,255,0.1),rgba(0,0,0,0))]"></div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-8">
          <Bot className="w-10 h-10 text-blue-500 mr-3" />
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
            GitAgent Explorer
          </h1>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center space-x-4 mb-6">
            <SearchModeButton mode="trending" icon={TrendingUp} label="Trending" />
            <SearchModeButton mode="simple" icon={Search} label="Simple Search" />
            <SearchModeButton mode="agent" icon={BrainCircuit} label="Agent Search" />
            <SearchModeButton mode="code" icon={BookCode} label="Code Search" />
          </div>

          {/* Parameters are now always visible */}
          <div className="mb-6 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
            {renderParameters()}
          </div>

          <form onSubmit={handleSearch} className="relative mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  searchMode === 'trending' ? "Filter trending projects..." :
                  searchMode === 'simple' ? "Search repositories..." :
                  searchMode === 'agent' ? "Describe your ideal project..." :
                  "Enter code snippet or pattern..."
                }
                className="w-full bg-gray-900 border border-gray-700 rounded-full py-3 pl-12 pr-32 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-2 flex items-center transition-colors"
              >
                {searchMode === 'agent' ? <BrainCircuit className="w-4 h-4 mr-2" /> :
                 searchMode === 'code' ? <BookCode className="w-4 h-4 mr-2" /> :
                 <Sparkles className="w-4 h-4 mr-2" />}
                {searchMode === 'agent' ? 'Discover' : 'Search'}
              </button>
            </div>
          </form>

          {isLoading ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <p className="text-gray-400">
                {searchMode === 'agent' ? 'AI agents are searching the GitHub universe...' :
                 searchMode === 'code' ? 'Analyzing code patterns...' :
                 'Loading up to 1000 repositories...'}
              </p>
            </div>
          ) : (
            <div className="max-h-[75vh] overflow-y-auto pr-2" ref={resultsContainerRef}>
              {renderResults()}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">API Settings</h2>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">GitHub Token</label>
                <input
                  type="password"
                  value={apiKeys.github}
                  onChange={(e) => setApiKeys({...apiKeys, github: e.target.value})}
                  placeholder="GitHub Personal Access Token"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Anthropic API Key</label>
                <input
                  type="password"
                  value={apiKeys.anthropic}
                  onChange={(e) => setApiKeys({...apiKeys, anthropic: e.target.value})}
                  placeholder="Anthropic API Key"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">OpenAI API Key (Optional)</label>
                <input
                  type="password"
                  value={apiKeys.openai || ''}
                  onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})}
                  placeholder="OpenAI API Key"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="bg-gray-800 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors mr-2"
              >
                Cancel
              </button>
              <button
                onClick={saveApiKeys}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateRelevanceScore(repo: GitHubRepo, codeResults: any[], codeContext: CodeContextItem[] = []): number {
  // Always use the most effective methodology (what used to be in "expert" mode)
  const baseScore = 85;
  const codeMatches = codeResults.filter(r => r.repository.id === repo.id).length;
  
  // Add context-based bonus if we have code context
  let contextBonus = 0;
  if (codeContext.length > 0) {
    // More sophisticated context matching for what used to be "deep" search
    const matchingPatterns = codeContext.flatMap(ctx => ctx.patterns).filter(pattern => 
      repo.description?.toLowerCase().includes(pattern.toLowerCase())
    ).length;
    
    contextBonus = Math.min(15, matchingPatterns * 3);
  }
  
  return Math.min(100, baseScore + (codeMatches * 5) + contextBonus);
}

function calculateCodeQuality(repo: GitHubRepo): number {
  // Implement code quality scoring based on various metrics
  const baseScore = 85;
  const starsBonus = Math.min(10, Math.floor(Math.log10(repo.stargazers_count)));
  const forksBonus = Math.min(5, Math.floor(Math.log10(repo.forks_count)));
  return Math.min(100, baseScore + starsBonus + forksBonus);
}

function renderCodeResults(results: any[]) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {results.map((result) => (
        <div
          key={result.sha}
          className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-3 hover:border-blue-500 transition-all duration-300 flex flex-col h-full"
        >
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-medium truncate">
              <a
                href={result.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors"
              >
                {result.path.split('/').pop()}
              </a>
            </h3>
          </div>
          
          <p className="text-xs text-gray-400 mb-2 truncate">
            {result.repository.full_name}
          </p>

          <div className="bg-black/30 rounded p-2 mb-2 overflow-x-auto">
            <pre className="text-xs">
              <code className="text-gray-300">
                {result.content.split('\n').slice(0, 3).join('\n')}
                {result.content.split('\n').length > 3 ? '\n...' : ''}
              </code>
            </pre>
          </div>

          <div className="flex items-center justify-between text-xs mt-auto">
            <div className="flex items-center gap-2">
              <Star className="w-3 h-3 text-yellow-500" />
              <span className="text-gray-400">
                {result.repository.stargazers_count.toLocaleString()}
              </span>
            </div>
            <span className="text-gray-400">
              {result.repository.language}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;