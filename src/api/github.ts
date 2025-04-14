import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_TOKEN,
});

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics?: string[];
  html_url: string;
  owner: {
    avatar_url: string;
    login: string;
  } | null;
}

export interface SearchParams {
  language?: string;
  timeframe?: string;
  sortBy?: string;
  topic?: string;
  minStars?: string;
  projectType?: string;
  customProjectType?: string;
  techStack?: string[];
  fileType?: string;
  searchScope?: string;
  query?: string;
  codeLanguage?: string;
  searchIn?: string;
  extension?: string;
  orgFilter?: string;
  page?: number;
  loadAll?: boolean;
}

export async function getTrendingRepos(params: SearchParams): Promise<GitHubRepo[]> {
  const date = new Date();
  date.setDate(date.getDate() - getTimeframeDays(params.timeframe));
  
  // Build a more comprehensive query with all applicable filters
  const queryParts = [];
  
  // Date range filter
  queryParts.push(`created:>${date.toISOString().split('T')[0]}`);
  
  // Language filter
  if (params.language !== 'any') {
    queryParts.push(`language:${params.language}`);
  }
  
  // Stars filter
  if (params.minStars && params.minStars !== '0') {
    queryParts.push(`stars:>${params.minStars}`);
  }
  
  // Topic filter
  if (params.topic && params.topic !== 'all') {
    queryParts.push(`topic:${params.topic}`);
  }
  
  // Organization filter
  if (params.orgFilter) {
    queryParts.push(`org:${params.orgFilter}`);
  }
  
  // Text search term (if provided)
  if (params.query) {
    queryParts.push(params.query);
  }
  
  const query = queryParts.join(' ');
  
  try {
    const { data } = await octokit.search.repos({
      q: query,
      sort: params.sortBy === 'updated' ? 'updated' : 'stars',
      order: 'desc',
      per_page: 100, // Maximum allowed by GitHub API
      page: params.page || 1,
    });

    // Return up to 100 results per page
    return data.items as GitHubRepo[];
  } catch (error) {
    console.error('Error fetching trending repos:', error);
    return [];
  }
}

export async function fetchAllTrendingRepos(params: SearchParams): Promise<GitHubRepo[]> {
  // This function fetches up to 1000 repositories (10 pages of 100 each)
  try {
    const allRepos = [];
    const maxPages = 10; // GitHub API limits to 1000 results (10 pages of 100)
    
    for (let page = 1; page <= maxPages; page++) {
      const repos = await getTrendingRepos({ ...params, page });
      allRepos.push(...repos);
      
      // If we get fewer than 100 results, we've reached the end
      if (repos.length < 100) {
        break;
      }
    }
    
    return allRepos;
  } catch (error) {
    console.error('Error fetching all trending repos:', error);
    return [];
  }
}

export async function searchRepos(params: SearchParams): Promise<GitHubRepo[]> {
  const starsQuery = params.minStars !== '0' ? `stars:>${params.minStars}` : '';
  const languageQuery = params.language !== 'any' ? `language:${params.language}` : '';
  const topicQuery = params.topic !== 'all' ? `topic:${params.topic}` : '';
  
  const query = `${params.query} ${starsQuery} ${languageQuery} ${topicQuery}`.trim();
  
  try {
    const { data } = await octokit.search.repos({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: 100,
      page: params.page || 1,
    });

    return data.items as GitHubRepo[];
  } catch (error) {
    console.error('Error searching repos:', error);
    return [];
  }
}

export async function searchCode(params: SearchParams): Promise<any[]> {
  const languageQuery = params.codeLanguage !== 'any' ? `language:${params.codeLanguage}` : '';
  const extensionQuery = params.extension !== 'any' ? `extension:${params.extension}` : '';
  const searchInQuery = params.searchIn !== 'file' ? `in:${params.searchIn}` : '';
  
  const query = [
    params.query,
    languageQuery,
    extensionQuery,
    searchInQuery
  ].filter(Boolean).join(' ');
  
  try {
    const { data } = await octokit.search.code({
      q: query,
      sort: (params.sortBy === 'recently-indexed' ? 'indexed' : 
            params.sortBy === 'recently-updated' ? 'updated' : 
            undefined) as 'indexed' | undefined,
      per_page: 100,
      page: params.page || 1,
      order: 'desc'
    });

    return Promise.all(
      data.items.map(async (item) => {
        try {
          const { data: content } = await octokit.repos.getContent({
            owner: item.repository.owner.login,
            repo: item.repository.name,
            path: item.path,
          });

          return {
            ...item,
            content: typeof content === 'object' && 'content' in content ? 
              atob(content.content) : '',
            repository: await octokit.repos.get({
              owner: item.repository.owner.login,
              repo: item.repository.name,
            }).then(res => res.data),
          };
        } catch (error) {
          // Handle rate limiting or file access issues
          return {
            ...item,
            content: '',
            repository: item.repository,
          };
        }
      })
    );
  } catch (error) {
    console.error('Error searching code:', error);
    return [];
  }
}

function getTimeframeDays(timeframe?: string): number {
  switch (timeframe) {
    case 'day': return 1;
    case 'week': return 7;
    case 'month': return 30;
    case 'year': return 365;
    default: return 7;
  }
}