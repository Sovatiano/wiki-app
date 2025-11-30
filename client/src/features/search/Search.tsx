import React, { useState } from 'react'
import { useSearchPagesQuery } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Input from '../../components/ui/Input'
import './Search.css'

const Search: React.FC = () => {
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  const { data: results, isLoading } = useSearchPagesQuery(searchTerm, {
    skip: !searchTerm || searchTerm.length < 1,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setSearchTerm(query.trim())
    }
  }

  const handlePageClick = (pageId: number) => {
    navigate(`/page/${pageId}`)
  }

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>Search Pages</h1>
        <form onSubmit={handleSearch} className="search-form">
          <Input
            type="text"
            placeholder="Search pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>
      </div>

      {isLoading && (
        <div className="loading">
          <Spinner size="large" />
        </div>
      )}

      {searchTerm && results && (
        <div className="search-results">
          <h2>Results for "{searchTerm}"</h2>
          {results.length === 0 ? (
            <div className="no-results">No pages found</div>
          ) : (
            <div className="results-list">
              {results.map((result: any) => (
                <div
                  key={result.page.id}
                  className="result-item"
                  onClick={() => handlePageClick(result.page.id)}
                >
                  <h3>{result.page.title}</h3>
                  <p className="result-meta">
                    By {result.page.author.username} •{' '}
                    {new Date(result.page.created_at).toLocaleDateString()}
                  </p>
                  <div
                    className="result-preview"
                    dangerouslySetInnerHTML={{ __html: result.highlight.content }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!searchTerm && (
        <div className="search-placeholder">
          <p>Enter a search term to find pages</p>
        </div>
      )}
    </div>
  )
}

export default Search

