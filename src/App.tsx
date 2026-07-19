import { useState, useEffect } from 'react'
import { Search, MapPin, Briefcase, Loader2, Upload, CheckCircle2, BrainCircuit, Heart, Trash2, Clock, Globe, AlertTriangle, Lightbulb, ChevronLeft, MessageSquare, Sparkles, Send, Copy, Zap } from 'lucide-react'

const API_URL = "http://localhost:8000"

function App() {
  const [searchTerm, setSearchTerm] = useState('Software Engineer')
  const [location, setLocation] = useState('')
  const [isIntern, setIsIntern] = useState(false)
  const [isRemote, setIsRemote] = useState(false)
  const [datePosted, setDatePosted] = useState('all')
  const [jobs, setJobs] = useState<any[]>([])
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [view, setView] = useState<'search' | 'saved' | 'analysis' | 'chatbot'>('search')
  const [loading, setLoading] = useState(false)
  const [resumeText, setResumeText] = useState('')
  
  const [jobAnalysis, setJobAnalysis] = useState<{[key: string]: any}>({})
  const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<any>(null)

  // Chatbot State
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)
  const [tailoredResume, setTailoredResume] = useState('')
  const [isTailoring, setIsTailoring] = useState(false)

  const fetchJobs = async (customQuery?: string) => {
    const q = customQuery || searchTerm
    console.log("Searching for:", q)
    setLoading(true)
    try {
      const url = new URL(`${API_URL}/jobs`)
      url.searchParams.append("query", q)
      url.searchParams.append("location", location)
      url.searchParams.append("is_internship", isIntern.toString())
      url.searchParams.append("remote_only", isRemote.toString())
      url.searchParams.append("date_posted", datePosted)
      const response = await fetch(url.toString())
      const data = await response.json()
      setJobs(Array.isArray(data) ? data : [])
    } catch (err) { 
      console.error("Fetch Error:", err) 
      alert("Backend se jobs nahi aa rahi hain.")
    } finally { 
      setLoading(false) 
    }
  }

  const analyzeJob = async (job: any) => {
    if (!resumeText) return alert("Pehle Resume upload karein!")
    const jobId = job.job_id || job.id
    setAnalyzingJobId(jobId)
    try {
      const response = await fetch(`${API_URL}/analyze-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, job_description: job.job_description })
      })
      const data = await response.json()
      setJobAnalysis(prev => ({ ...prev, [jobId]: data }))
    } catch (err) { 
      console.error("Analysis Error:", err) 
    } finally { 
      setAnalyzingJobId(null) 
    }
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return
    const userMsg = chatInput
    setChatInput('')
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])
    setIsChatting(true)
    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory,
          resume_text: resumeText,
          job_description: selectedJob?.job_description
        })
      })
      const data = await response.json()
      setChatHistory(prev => [...prev, { role: 'ai', content: data.response || data.error }])
    } catch (err) {
      console.error(err)
    } finally {
      setIsChatting(false)
    }
  }

  const tailorResume = async () => {
    if (!selectedJob) return
    setIsTailoring(true)
    try {
      const response = await fetch(`${API_URL}/tailor-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: selectedJob.job_description
        })
      })
      const data = await response.json()
      setTailoredResume(data.tailored_resume)
      setChatHistory(prev => [...prev, { role: 'ai', content: "I have prepared a tailored version of your resume optimized for this JD! You can see it below." }])
    } catch (err) {
      console.error(err)
    } finally {
      setIsTailoring(false)
    }
  }

  const autoUpload = async () => {
    if (!selectedJob || !tailoredResume) return
    try {
      const response = await fetch(`${API_URL}/auto-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: selectedJob.job_id,
          resume_content: tailoredResume
        })
      })
      const data = await response.json()
      alert(data.message)
    } catch (err) {
      console.error(err)
    }
  }

  const onResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/upload-resume`, { method: "POST", body: formData })
      const data = await res.json()
      if (data.error) {
        alert(`Resume Error: ${data.error}`)
        return
      }
      setResumeText(data.text)
      if (data.keywords) {
        setSearchTerm(data.keywords)
      }
    } catch (err) { 
      alert("Resume upload fail ho gaya!") 
    } finally {
      setLoading(false)
    }
  }

  const fetchSavedJobs = async () => {
    try {
      const response = await fetch(`${API_URL}/saved-jobs`)
      const data = await response.json()
      setSavedJobs(Array.isArray(data) ? data : [])
    } catch (err) { console.error(err) }
  }

  const saveJob = async (job: any) => {
    try {
      await fetch(`${API_URL}/save-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job)
      })
      fetchSavedJobs()
      alert("Job Saved!")
    } catch (err) { console.error(err) }
  }

  const removeJob = async (jobId: string) => {
    try {
      await fetch(`${API_URL}/remove-job/${jobId}`, { method: "DELETE" })
      fetchSavedJobs()
    } catch (err) { console.error(err) }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Recently"
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  }

  useEffect(() => { 
    fetchJobs()
    fetchSavedJobs() 
  }, [datePosted])

  return (
    <div className="min-h-screen bg-gray-50 w-full p-4 md:p-8 font-sans">
      <header className="max-w-5xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          {view !== 'search' && (
            <button onClick={() => setView('search')} className="p-2 hover:bg-white rounded-full transition-all text-gray-400 hover:text-indigo-600 shadow-sm"><ChevronLeft /></button>
          )}
          <div>
            <h1 className="text-4xl font-black text-indigo-600">JobHive</h1>
            <div className="flex gap-6 mt-2">
              <button onClick={() => setView('search')} className={`font-bold transition-all text-sm ${view === 'search' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>Search</button>
              <button onClick={() => setView('saved')} className={`font-bold transition-all text-sm ${view === 'saved' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>Saved ({savedJobs.length})</button>
            </div>
          </div>
        </div>

        <label className={`flex flex-col items-center justify-center border-2 border-dashed p-4 rounded-2xl cursor-pointer transition-all w-full md:w-auto ${resumeText ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-300 hover:border-indigo-400'}`}>
          <div className="flex items-center gap-2">
            {resumeText ? <CheckCircle2 size={20} /> : <Upload size={20} />}
            <span className="font-bold text-sm uppercase tracking-wider">{resumeText ? 'Resume Loaded' : 'Upload Resume (PDF)'}</span>
          </div>
          <input type="file" className="hidden" accept=".pdf" onChange={onResumeUpload} />
        </label>
      </header>

      {view === 'search' && (
        <div className="max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mb-10 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="What job are you looking for?" className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-50 focus:border-indigo-500 focus:outline-none transition-all text-lg" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => fetchJobs()} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all">Find Jobs</button>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
               <input type="text" placeholder="Location (optional)" className="flex-1 min-w-[180px] px-6 py-3 rounded-xl border-2 border-gray-50 focus:border-indigo-400 focus:outline-none transition-all" value={location} onChange={e => setLocation(e.target.value)} />
                <select className="px-6 py-3 rounded-xl border-2 border-gray-50 font-bold text-gray-600 focus:border-indigo-400 focus:outline-none bg-white" value={datePosted} onChange={(e) => setDatePosted(e.target.value)}>
                  <option value="all">Any Time</option>
                  <option value="today">Today</option>
                  <option value="3days">Last 3 Days</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
                <button onClick={() => setIsRemote(!isRemote)} className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${isRemote ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>Remote</button>
                <button onClick={() => setIsIntern(!isIntern)} className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${isIntern ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>Internship</button>
            </div>
          </div>

          <div className="grid gap-6">
            {loading ? (
              <div className="text-center py-24">
                <Loader2 className="animate-spin mx-auto text-indigo-600 mb-4" size={48} />
                <p className="text-xl font-bold text-gray-400">Finding best matches for you...</p>
              </div>
            ) : (
              jobs.map((job, idx) => {
                const uniqueId = job.job_id || `job-${idx}`
                const analysis = jobAnalysis[uniqueId]
                const isAnalyzing = analyzingJobId === uniqueId

                return (
                  <div key={uniqueId} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all flex flex-col gap-6 group relative overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">{job.job_publisher}</span>
                          <span className="flex items-center gap-1 text-xs font-bold text-gray-400"><Clock size={12} /> {formatDate(job.job_posted_at_datetime_utc)}</span>
                        </div>
                        <h3 className="font-black text-2xl text-gray-800 group-hover:text-indigo-600 transition-colors leading-tight">{job.job_title}</h3>
                        <p className="text-indigo-600 font-bold text-lg">{job.employer_name}</p>
                        <div className="flex flex-wrap gap-4 mt-4 text-sm font-bold text-gray-400">
                          <span className="flex items-center gap-1"><MapPin size={16} /> {job.job_city || 'Remote'}</span>
                          <span className="flex items-center gap-1"><Briefcase size={16} /> {job.job_employment_type}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={() => analyzeJob(job)} disabled={isAnalyzing} className={`flex-1 md:flex-none p-4 rounded-2xl transition-all flex items-center justify-center gap-2 ${analysis ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-50 border-2 border-indigo-50'}`}>
                          {isAnalyzing ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
                          {analysis ? `${analysis.match_score}%` : 'ATS Score'}
                        </button>
                        <button onClick={() => saveJob(job)} className="p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all border-2 border-red-50"><Heart /></button>
                        <a href={job.job_apply_link} target="_blank" className="flex-[2] md:flex-none bg-gray-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-black transition-all text-center">Apply</a>
                      </div>
                    </div>

                    {analysis && (
                      <div className="mt-2 flex justify-end">
                        <button 
                          onClick={() => { setSelectedJob(job); setView('analysis'); }} 
                          className="flex items-center gap-2 text-indigo-600 font-black text-sm uppercase tracking-widest hover:translate-x-1 transition-all"
                        >
                          More Details <ChevronLeft className="rotate-180" size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {view === 'analysis' && selectedJob && (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-50">
            <div className={`p-12 text-center ${jobAnalysis[selectedJob.job_id]?.match_score >= 80 ? 'bg-green-600' : 'bg-indigo-600'} text-white relative`}>
              <button onClick={() => setView('search')} className="absolute left-8 top-8 p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><ChevronLeft /></button>
              <p className="text-sm font-black uppercase tracking-[0.3em] mb-4 opacity-80">Overall Match Score</p>
              <h2 className="text-9xl font-black mb-6">{jobAnalysis[selectedJob.job_id]?.match_score}%</h2>
              <div className="flex justify-center gap-4">
                <span className="bg-white/20 px-6 py-2 rounded-full font-bold text-sm uppercase">{selectedJob.job_title}</span>
                <span className="bg-white/20 px-6 py-2 rounded-full font-bold text-sm uppercase">{selectedJob.employer_name}</span>
              </div>
            </div>

            <div className="p-12 space-y-12">
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3"><AlertTriangle className="text-orange-500" /> Critical Gaps</h3>
                  <div className="flex flex-wrap gap-3">
                    {jobAnalysis[selectedJob.job_id]?.missing_skills?.map((s: string) => (
                      <span key={s} className="bg-orange-50 text-orange-700 px-6 py-3 rounded-2xl font-bold border border-orange-100">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3"><Lightbulb className="text-indigo-600" /> Strategic Advice</h3>
                  <p className="text-gray-600 leading-relaxed font-medium text-lg italic">"{jobAnalysis[selectedJob.job_id]?.resume_changes}"</p>
                </div>
              </div>

              <div className="bg-gray-900 rounded-[32px] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1">
                  <h4 className="text-3xl font-black mb-3">Tailor your Resume?</h4>
                  <p className="text-gray-400 font-medium">Our AI Chatbot can rewrite your resume specifically for this JD to boost your score to 90%+. Try it now!</p>
                </div>
                <button 
                  onClick={() => { setView('chatbot'); setChatHistory([{role: 'ai', content: `Hello! I see you're interested in the ${selectedJob.job_title} role at ${selectedJob.employer_name}. Your current score is ${jobAnalysis[selectedJob.job_id]?.match_score}%. How can I help you improve it? I can also tailor your resume automatically.`}])}} 
                  className="bg-indigo-500 hover:bg-indigo-400 text-white px-10 py-6 rounded-3xl font-black text-xl shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-3 active:scale-95"
                >
                  <MessageSquare /> Open Chatbot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'chatbot' && selectedJob && (
        <div className="max-w-5xl mx-auto h-[80vh] flex flex-col md:flex-row gap-6 animate-in zoom-in-95 duration-300">
          <div className="flex-1 bg-white rounded-[32px] shadow-xl border border-gray-100 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Sparkles /></div>
                <div>
                  <h3 className="font-black text-gray-800">Career Coach AI</h3>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Tailoring for {selectedJob.job_title}</p>
                </div>
              </div>
              <button onClick={() => setView('analysis')} className="p-3 hover:bg-white rounded-xl transition-all text-gray-400"><ChevronLeft /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-5 rounded-[24px] font-medium text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-50 text-gray-700 rounded-tl-none border border-gray-100 shadow-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 p-4 rounded-2xl animate-pulse flex gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ask about improvements or type 'tailor my resume'..." 
                  className="w-full pl-6 pr-16 py-5 rounded-2xl border-2 border-white focus:border-indigo-500 focus:outline-none shadow-sm transition-all"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                />
                <button onClick={sendChatMessage} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg"><Send size={20}/></button>
              </div>
            </div>
          </div>

          <div className="w-full md:w-80 flex flex-col gap-4">
             <button 
              onClick={tailorResume} 
              disabled={isTailoring}
              className="w-full bg-white border-2 border-indigo-600 text-indigo-600 p-6 rounded-[32px] font-black hover:bg-indigo-50 transition-all flex flex-col items-center gap-2 shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
             >
                {isTailoring ? <Loader2 className="animate-spin" /> : <Sparkles className="text-indigo-600" />}
                <span>Auto-Generate Resume</span>
             </button>

             {tailoredResume && (
               <div className="flex-1 bg-gray-900 rounded-[32px] p-6 text-white flex flex-col gap-6 animate-in slide-in-from-right-4">
                  <h4 className="font-black text-xl flex items-center gap-2"><CheckCircle2 className="text-green-400" /> Ready to Go!</h4>
                  <div className="space-y-3">
                    <button onClick={() => { navigator.clipboard.writeText(tailoredResume); alert("Copied!"); }} className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-between font-bold text-sm transition-all">
                      Copy Text <Copy size={16}/>
                    </button>
                    <button onClick={autoUpload} className="w-full bg-green-500 hover:bg-green-400 p-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all shadow-lg shadow-green-500/20 active:scale-95">
                      <Zap size={16}/> Auto-Upload JD
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-black/30 rounded-2xl p-4 text-[10px] font-mono opacity-60">
                    {tailoredResume.substring(0, 500)}...
                  </div>
               </div>
             )}
          </div>
        </div>
      )}

      {view === 'saved' && (
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-gray-800 mb-8">Saved Collection</h2>
          <div className="grid gap-6">
            {savedJobs.map(job => (
              <div key={job.id} className="bg-white p-8 rounded-3xl border-2 border-gray-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <h3 className="font-black text-xl text-gray-800">{job.title}</h3>
                  <p className="text-indigo-600 font-bold">{job.company} • {job.location}</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <button onClick={() => removeJob(job.job_id)} className="p-4 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 /></button>
                  <a href={job.apply_link} target="_blank" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-center shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Go Apply</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
