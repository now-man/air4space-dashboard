import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Zap, Settings, ShieldAlert, Target, BotMessageSquare, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

// --- 데이터 파싱 함수 ---
// CSV 텍스트를 Recharts가 사용 가능한 JSON 배열로 변환합니다.
const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, index) => {
      // 숫자로 변환 가능한 값은 숫자로, 아니면 텍스트로 저장
      obj[header.trim()] = isNaN(values[index]) ? values[index] : parseFloat(values[index]);
      return obj;
    }, {});
  });
};


// --- 메인 앱 컴포넌트 ---
export default function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'settings', 'feedback'

  // --- 상태 관리 ---
  const [unitProfile, setUnitProfile] = useState(() => {
    try {
      const savedProfile = localStorage.getItem('unitProfile');
      return savedProfile ? JSON.parse(savedProfile) : {
        unitName: "제17전투비행단",
        defaultThreshold: 4.0, // Kp 지수 임계값으로 변경
        equipment: [
          { id: 1, name: "JDAM", sensitivity: 5.0 },
          { id: 2, name: "정찰 드론 (A형)", sensitivity: 6.0 },
          { id: 3, name: "전술 데이터링크", sensitivity: 4.0 },
        ],
      };
    } catch (error) {
       return {
        unitName: "제17전투비행단",
        defaultThreshold: 4.0,
        equipment: [
          { id: 1, name: "JDAM", sensitivity: 5.0 },
          { id: 2, name: "정찰 드론 (A형)", sensitivity: 6.0 },
          { id: 3, name: "전술 데이터링크", sensitivity: 4.0 },
        ],
      };
    }
  });

  const [missionLogs, setMissionLogs] = useState(() => {
    try {
      const savedLogs = localStorage.getItem('missionLogs');
      return savedLogs ? JSON.parse(savedLogs) : [];
    } catch (error) {
      return [];
    }
  });

  // --- 실시간 우주기상 데이터를 담을 상태 ---
  const [spaceWeatherData, setSpaceWeatherData] = useState([]);

  // --- 효과 ---
  // 컴포넌트가 처음 마운트될 때 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        // public 폴더에 위치할 CSV 파일 요청
        const response = await fetch('/space_weather_data.csv');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const csvText = await response.text();
        const parsedData = parseCSV(csvText);
        setSpaceWeatherData(parsedData);
      } catch (error) {
        console.error("데이터를 가져오는 데 실패했습니다:", error);
        // 에러 발생 시 빈 데이터를 설정하여 차트가 깨지지 않도록 함
        setSpaceWeatherData([]);
      }
    };
    fetchData();

    // 10분마다 데이터를 다시 가져와서 업데이트 (선택사항)
    // Netlify 자동 배포로도 충분하지만, 사용자가 페이지를 계속 켜놓는 경우를 대비
    const interval = setInterval(fetchData, 600000); // 10분 = 600,000ms
    return () => clearInterval(interval); // 컴포넌트 언마운트 시 인터벌 정리

  }, []);


  useEffect(() => {
    localStorage.setItem('unitProfile', JSON.stringify(unitProfile));
  }, [unitProfile]);

  useEffect(() => {
    localStorage.setItem('missionLogs', JSON.stringify(missionLogs));
  }, [missionLogs]);

  // --- 로직 (피드백 제출) ---
  const handleFeedbackSubmit = (log) => {
    const newLogs = [...missionLogs, { ...log, id: Date.now() }];
    setMissionLogs(newLogs);
    // 피드백 기반 임계값 조정 로직은 그대로 유지 (필요시 수정)
    setActiveView('dashboard');
  };

  // --- 뷰 렌더링 ---
  const renderView = () => {
    switch (activeView) {
      case 'settings':
        return <SettingsView profile={unitProfile} setProfile={setUnitProfile} goBack={() => setActiveView('dashboard')} />;
      case 'feedback':
        return <FeedbackView equipment={unitProfile.equipment} onSubmit={handleFeedbackSubmit} goBack={() => setActiveView('dashboard')} />;
      default:
        // forecast prop에 spaceWeatherData를 전달
        return <DashboardView profile={unitProfile} forecast={spaceWeatherData} logs={missionLogs} />;
    }
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans p-4 md:p-6 lg:p-8">
      <Header unitName={unitProfile.unitName} setActiveView={setActiveView} activeView={activeView} />
      <main className="mt-6">
        {renderView()}
      </main>
    </div>
  );
}

// --- 헤더 컴포넌트 ---
const Header = ({ unitName, setActiveView, activeView }) => (
    <header className="flex justify-between items-center pb-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
            <ShieldAlert className="w-8 h-8 text-cyan-400 flex-shrink-0" />
            <div>
                <h1 className="text-lg md:text-2xl font-bold text-white leading-tight">{unitName}</h1>
                <p className="text-xs md:text-sm text-gray-400">우주기상 기반 작전 지원 대시보드</p>
            </div>
        </div>
        {activeView === 'dashboard' && (
            <div className="flex items-center space-x-2">
                <button onClick={() => setActiveView('feedback')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center space-x-2 transition-colors">
                    <Plus className="w-5 h-5" />
                    <span className="hidden md:inline text-sm">피드백</span>
                </button>
                <button onClick={() => setActiveView('settings')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-lg flex items-center space-x-2 transition-colors">
                    <Settings className="w-5 h-5" />
                    <span className="hidden md:inline text-sm">설정</span>
                </button>
            </div>
        )}
    </header>
);


// --- 대시보드 뷰 ---
const DashboardView = ({ profile, forecast, logs }) => {
    // forecast 데이터가 비어있을 경우를 대비
    const maxKp = useMemo(() => forecast.length > 0 ? Math.max(...forecast.map(d => d.kp_index)) : 0, [forecast]);

    const overallStatus = useMemo(() => {
        if (maxKp > profile.defaultThreshold) return { label: "위험", color: "text-red-400", bgColor: "bg-red-900/50", icon: <ShieldAlert className="w-8 h-8 md:w-10 md:h-10" /> };
        if (maxKp > profile.defaultThreshold * 0.7) return { label: "주의", color: "text-yellow-400", bgColor: "bg-yellow-900/50", icon: <Zap className="w-8 h-8 md:w-10 md:h-10" /> };
        return { label: "정상", color: "text-green-400", bgColor: "bg-green-900/50", icon: <Target className="w-8 h-8 md:w-10 md:h-10" /> };
    }, [maxKp, profile.defaultThreshold]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className={`p-4 md:p-6 rounded-xl flex flex-col md:flex-row items-center gap-4 md:gap-6 ${overallStatus.bgColor} border border-gray-700`}>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={overallStatus.color}>{overallStatus.icon}</div>
                        <div>
                            <p className="text-gray-400 text-xs md:text-sm">현재 종합 위험도</p>
                            <p className={`text-2xl md:text-3xl font-bold ${overallStatus.color}`}>{overallStatus.label}</p>
                        </div>
                    </div>
                    <div className="w-full md:w-auto flex justify-around md:justify-start md:gap-6 pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-600">
                        <div>
                            <p className="text-gray-400 text-xs md:text-sm">최대 Kp 지수</p>
                            <p className="text-2xl md:text-3xl font-bold text-white">{maxKp.toFixed(1)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs md:text-sm">부대 임계값</p>
                            <p className="text-2xl md:text-3xl font-bold text-cyan-400">{profile.defaultThreshold.toFixed(1)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
                    <h2 className="text-lg font-semibold mb-4 text-white">Planetary K-index (지난 24시간)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={forecast}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis dataKey="time" stroke="#A0AEC0" tick={{ fontSize: 12 }} />
                            <YAxis label={{ value: 'Kp Index', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} stroke="#A0AEC0" tick={{ fontSize: 12 }} domain={[0, 9]} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                            <Legend />
                            <Line type="monotone" dataKey="kp_index" name="Kp 지수" stroke="#F56565" strokeWidth={2} dot={false} />
                            <ReferenceLine y={profile.defaultThreshold} label={{ value: "부대 임계값", position: "insideTopRight", fill: "#4FD1C5" }} stroke="#4FD1C5" strokeDasharray="4 4" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-6">
                 <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
                    <h2 className="text-lg font-semibold mb-4 text-white">주요 장비별 작전 영향 분석</h2>
                    <div className="space-y-3">
                        {profile.equipment.map(eq => {
                            const isAtRisk = maxKp > eq.sensitivity;
                            return (
                                <div key={eq.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
                                    <span className="font-medium text-sm">{eq.name}</span>
                                    <div className="text-right">
                                        <span className={`font-bold text-sm px-3 py-1 rounded-full ${isAtRisk ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {isAtRisk ? '위험' : '정상'}
                                        </span>
                                        <p className="text-xs text-gray-400 mt-1">임계값: Kp {eq.sensitivity.toFixed(1)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
                    <h2 className="text-lg font-semibold mb-4 text-white">최근 작전 피드백</h2>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                        {logs.length > 0 ? [...logs].reverse().map(log => (
                            <div key={log.id} className="text-sm border-l-2 pl-3 border-blue-500">
                                <p className="font-semibold text-gray-300">{log.time} - {log.equipment}</p>
                                <p className="text-gray-400">영향: <span className={`font-bold ${log.impactLevel === '위험' ? 'text-red-400' : log.impactLevel === '주의' ? 'text-yellow-400' : 'text-green-400'}`}>{log.impactLevel}</span></p>
                            </div>
                        )) : <p className="text-gray-500 text-sm">입력된 피드백이 없습니다.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 부대 설정 뷰 (SettingsView) ---
// (기존 코드와 거의 동일, 임계값 단위를 Kp로 인지하고 사용)
const SettingsView = ({ profile, setProfile, goBack }) => {
    const [localProfile, setLocalProfile] = useState(JSON.parse(JSON.stringify(profile)));

    const handleSave = () => {
        setProfile(localProfile);
        goBack();
    };

    const handleEquipmentChange = (id, field, value) => {
        const updatedEquipment = localProfile.equipment.map(eq =>
            eq.id === id ? { ...eq, [field]: value } : eq
        );
        setLocalProfile({ ...localProfile, equipment: updatedEquipment });
    };

    const addEquipment = () => {
        const newId = localProfile.equipment.length > 0 ? Math.max(...localProfile.equipment.map(e => e.id)) + 1 : 1;
        setLocalProfile({
            ...localProfile,
            equipment: [...localProfile.equipment, { id: newId, name: "신규 장비", sensitivity: 5.0 }]
        });
    };

    const removeEquipment = (id) => {
        setLocalProfile({
            ...localProfile,
            equipment: localProfile.equipment.filter(eq => eq.id !== id)
        });
    };

    return (
        <div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto">
            <div className="flex items-center mb-6">
                <button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl md:text-2xl font-bold text-white">부대 프로필 설정</h2>
            </div>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">부대명</label>
                    <input type="text" value={localProfile.unitName} onChange={e => setLocalProfile({ ...localProfile, unitName: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">종합 위험도 임계값 (Kp 지수)</label>
                    <input type="number" step="0.1" value={localProfile.defaultThreshold} onChange={e => setLocalProfile({ ...localProfile, defaultThreshold: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white mb-3">주요 장비 및 민감도 설정 (Kp 지수 기준)</h3>
                    <div className="space-y-4">
                        {localProfile.equipment.map(eq => (
                            <div key={eq.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center bg-gray-700/50 p-4 rounded-lg">
                                <input type="text" value={eq.name} onChange={e => handleEquipmentChange(eq.id, 'name', e.target.value)}
                                    className="md:col-span-3 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="장비명" />
                                <div className="md:col-span-2 flex items-center space-x-2">
                                    <input type="range" min="1" max="9" step="0.5" value={eq.sensitivity} onChange={e => handleEquipmentChange(eq.id, 'sensitivity', parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                                    <span className="text-cyan-400 font-mono w-16 text-center">Kp {eq.sensitivity.toFixed(1)}</span>
                                </div>
                                <button onClick={() => removeEquipment(eq.id)} className="md:col-span-1 text-red-400 hover:text-red-300 p-2 justify-self-end">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button onClick={addEquipment} className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-cyan-400 font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors">
                        <Plus className="w-5 h-5" />
                        <span>장비 추가</span>
                    </button>
                </div>
            </div>
            <div className="mt-8 flex justify-end">
                <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2 transition-colors">
                    <Save className="w-5 h-5" />
                    <span>저장</span>
                </button>
            </div>
        </div>
    );
};

// --- 작전 피드백 입력 뷰 (FeedbackView) ---
// (기존 코드와 동일)
const FeedbackView = ({ equipment, onSubmit, goBack }) => {
    const [log, setLog] = useState({
        time: new Date().toTimeString().slice(0, 5),
        equipment: equipment.length > 0 ? equipment[0].name : '',
        impactLevel: '정상',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!log.equipment) {
            alert("장비를 선택해주세요.");
            return;
        }
        onSubmit(log);
    };

    return (
        <div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto">
            <div className="flex items-center mb-6">
                <button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl md:text-2xl font-bold text-white">작전 피드백 입력</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">작전 시간</label>
                    <input type="time" value={log.time} onChange={e => setLog({ ...log, time: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">운용 장비</label>
                    <select value={log.equipment} onChange={e => setLog({ ...log, equipment: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                        {equipment.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">관측된 GNSS 영향 수준</label>
                    <div className="grid grid-cols-3 gap-3">
                        {['정상', '주의', '위험'].map(level => (
                            <button key={level} type="button" onClick={() => setLog({ ...log, impactLevel: level })}
                                className={`p-3 rounded-lg text-center font-semibold transition-all
                  ${log.impactLevel === level ?
                    (level === '정상' ? 'bg-green-500 text-white' : level === '주의' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white') :
                    'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                                    {level}
                                </button>
                            ))}
                    </div>
                </div>
                <div className="pt-4 flex justify-end">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2 transition-colors">
                        <BotMessageSquare className="w-5 h-5" />
                        <span>피드백 제출</span>
                    </button>
                </div>
            </form>
        </div>
    );
};
