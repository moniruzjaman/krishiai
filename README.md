# Krishi AI - Agricultural Intelligence Platform

A comprehensive AI-powered agricultural platform combining crop disease diagnosis, market insights, and farmer training tools.

## 🌾 Project Structure

This is a monorepo containing:

- **`krishiai-frontend/`** - React + TypeScript frontend application
- **`krishi-ai-backend/`** - FastAPI Python backend service
- **`directives/`** - Standard Operating Procedures (SOPs) in Markdown
- **`execution/`** - Deterministic Python automation scripts

## 🚀 Quick Start

### Frontend Setup

```bash
cd krishiai-frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Setup

```bash
cd krishi-ai-backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Unix/MacOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend API will be available at `http://localhost:8000`

## 🔧 Environment Configuration

### Frontend Environment Variables

Create `.env.local` in `krishiai-frontend/`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_BACKEND_URL=http://localhost:8000
```

### Backend Environment Variables

Create `.env` in `krishi-ai-backend/`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
GEMINI_API_KEY=your_gemini_api_key
ENVIRONMENT=development
```

## 📦 Tech Stack

### Frontend

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Supabase** - Database & authentication
- **Google Gemini AI** - AI capabilities
- **Recharts** - Data visualization

### Backend

- **FastAPI** - Modern Python web framework
- **Supabase** - Database client
- **Google Gemini AI** - AI processing
- **Transformers** - Local AI models
- **Pillow** - Image processing

## 🏗️ Architecture

The project follows a **3-Layer Architecture**:

1. **Directive Layer** - Natural language SOPs defining workflows
2. **Orchestration Layer** - Intelligent routing and decision-making
3. **Execution Layer** - Deterministic Python scripts for reliable operations

## 🌟 Key Features

- 🔍 **Crop Disease Diagnosis** - AI-powered plant health analysis
- 📊 **Market Intelligence** - Real-time agricultural market prices
- 🎓 **CABI Training** - Interactive farmer education modules
- 🌤️ **Weather Integration** - Location-based weather forecasts
- 💬 **AI Assistant** - Conversational agricultural advisor
- 📱 **Responsive Design** - Mobile-first interface

## 🧪 Testing

### Frontend

```bash
cd krishiai-frontend
npm run build  # Verify TypeScript compilation
```

### Backend

```bash
cd krishi-ai-backend
python -m pytest  # Run tests (if configured)
```

## 📝 Development Workflow

1. Check `directives/` for relevant SOPs before implementing features
2. Use scripts in `execution/` for deterministic operations
3. Update directives when discovering new patterns or constraints
4. Follow the self-annealing loop: Fix → Update → Test → Document

## 🚢 Deployment

### Frontend (Vercel)

The frontend is configured for Vercel deployment with `vercel.json`.

```bash
cd krishiai-frontend
npm run build
vercel deploy
```

### Backend (Vercel/Railway/Render)

The backend can be deployed to various platforms. See `vercel.json` for Vercel configuration.

```bash
cd krishi-ai-backend
# Deploy using your preferred platform
```

## 📄 License

Private project - All rights reserved

## 🤝 Contributing

This is a private project. For collaboration inquiries, please contact the project maintainer.

## 📞 Support

For issues or questions, please refer to the project documentation in `docs/` or contact the development team.

---

**Built with ❤️ for farmers and agricultural communities**
