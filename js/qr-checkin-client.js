// QR 체크인 시스템 클라이언트 JavaScript
// Google Apps Script Web App URL을 여기에 입력하세요
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzSZPxZG9J3RxmuWPrdGN_JvphpOErpEbG0vvdNPQtrr4AKCcxLQ9Me2tmXGM6SamdrVg/exec';

/**
 * JSONP를 사용한 GET 요청
 */
function jsonpRequest(params, callback) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonpCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const script = document.createElement('script');
    
    // 타임아웃 설정
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout'));
    }, 30000); // 30초 타임아웃
    
    // 글로벌 콜백 함수 생성
    window[callbackName] = function(data) {
      clearTimeout(timeout);
      cleanup();
      if (callback) callback(data);
      resolve(data);
    };
    
    // 정리 함수
    function cleanup() {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      delete window[callbackName];
    }
    
    // URL 파라미터 구성
    const urlParams = new URLSearchParams(params);
    urlParams.append('callback', callbackName);
    
    script.src = WEB_APP_URL + '?' + urlParams.toString();
    script.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Script loading failed'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * POST 요청 (form을 이용한 방식)
 */
function postRequest(data) {
  return new Promise((resolve, reject) => {
    const form = document.createElement('form');
    const iframe = document.createElement('iframe');
    const callbackName = 'postCallback_' + Date.now();
    
    // iframe 설정
    iframe.name = callbackName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // form 설정
    form.target = callbackName;
    form.method = 'POST';
    form.action = WEB_APP_URL;
    form.style.display = 'none';
    
    // 데이터를 form input으로 변환
    Object.keys(data).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = data[key];
      form.appendChild(input);
    });
    
    document.body.appendChild(form);
    
    // iframe 로드 완료 시 처리
    iframe.onload = function() {
      try {
        // 응답 처리는 서버에서 postMessage로 처리해야 함
        setTimeout(() => {
          document.body.removeChild(form);
          document.body.removeChild(iframe);
          resolve({ success: true, message: '요청이 전송되었습니다.' });
        }, 1000);
      } catch (error) {
        document.body.removeChild(form);
        document.body.removeChild(iframe);
        reject(error);
      }
    };
    
    form.submit();
  });
}

/**
 * 체크인 함수
 */
async function checkIn(userData) {
  try {
    // JSONP를 이용한 GET 요청으로 체크인
    const params = {
      action: 'checkin',
      name: userData.name || '',
      phone: userData.phone || '',
      email: userData.email || '',
      company: userData.company || '',
      note: userData.note || ''
    };
    
    const result = await jsonpRequest(params);
    console.log('체크인 결과:', result);
    return result;
  } catch (error) {
    console.error('체크인 오류:', error);
    throw error;
  }
}

/**
 * 체크인 기록 조회
 */
async function getRecords(limit = 100, date = null) {
  try {
    const params = {
      action: 'getRecords',
      limit: limit.toString()
    };
    
    if (date) {
      params.date = date;
    }
    
    const result = await jsonpRequest(params);
    console.log('기록 조회 결과:', result);
    return result;
  } catch (error) {
    console.error('기록 조회 오류:', error);
    throw error;
  }
}

/**
 * 통계 조회
 */
async function getStats() {
  try {
    const params = {
      action: 'getStats'
    };
    
    const result = await jsonpRequest(params);
    console.log('통계 조회 결과:', result);
    return result;
  } catch (error) {
    console.error('통계 조회 오류:', error);
    throw error;
  }
}

/**
 * 데이터 내보내기
 */
async function exportData() {
  try {
    const params = {
      action: 'exportData'
    };
    
    const result = await jsonpRequest(params);
    
    if (result.success && result.data && result.data.csv) {
      // CSV 파일 다운로드
      const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', result.data.filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    return result;
  } catch (error) {
    console.error('데이터 내보내기 오류:', error);
    throw error;
  }
}

/**
 * 실시간 통계 업데이트
 */
function updateStatsDisplay() {
  getStats()
    .then(result => {
      if (result.success) {
        const stats = result.data;
        
        // DOM 요소가 있는 경우 업데이트
        const totalElement = document.getElementById('total-count');
        const todayElement = document.getElementById('today-count');
        const weekElement = document.getElementById('week-count');
        const monthElement = document.getElementById('month-count');
        
        if (totalElement) totalElement.textContent = stats.total || 0;
        if (todayElement) todayElement.textContent = stats.today || 0;
        if (weekElement) weekElement.textContent = stats.thisWeek || 0;
        if (monthElement) monthElement.textContent = stats.thisMonth || 0;
        
        console.log('통계 업데이트 완료:', stats);
      }
    })
    .catch(error => {
      console.error('통계 업데이트 실패:', error);
    });
}

/**
 * 체크인 기록 표시
 */
function updateRecordsDisplay(limit = 50) {
  getRecords(limit)
    .then(result => {
      if (result.success) {
        const records = result.data;
        const tableBody = document.getElementById('records-table-body');
        
        if (tableBody) {
          tableBody.innerHTML = '';
          
          records.forEach(record => {
            const row = document.createElement('tr');
            const date = new Date(record.time);
            const formattedDate = date.toLocaleString('ko-KR');
            
            row.innerHTML = `
              <td>${formattedDate}</td>
              <td>${record.name}</td>
              <td>${record.phone}</td>
              <td>${record.email || '-'}</td>
              <td>${record.company || '-'}</td>
              <td>${record.note || '-'}</td>
            `;
            
            tableBody.appendChild(row);
          });
          
          console.log(`${records.length}개 기록 표시 완료`);
        }
      }
    })
    .catch(error => {
      console.error('기록 표시 실패:', error);
    });
}

/**
 * 체크인 폼 제출 처리
 */
function handleCheckInForm(formData) {
  const userData = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    company: formData.get('company'),
    note: formData.get('note')
  };
  
  return checkIn(userData)
    .then(result => {
      if (result.success) {
        alert('체크인이 완료되었습니다!');
        // 폼 리셋
        const form = document.getElementById('checkin-form');
        if (form) form.reset();
        
        // 통계 업데이트
        updateStatsDisplay();
      } else {
        alert('체크인 실패: ' + (result.error || '알 수 없는 오류'));
      }
      return result;
    })
    .catch(error => {
      alert('체크인 중 오류가 발생했습니다: ' + error.message);
      throw error;
    });
}

/**
 * 페이지 로드 시 초기화
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('QR 체크인 시스템 초기화 중...');
  
  // 통계 초기 로드
  updateStatsDisplay();
  
  // 관리자 페이지인 경우 기록도 로드
  if (document.getElementById('records-table-body')) {
    updateRecordsDisplay();
  }
  
  // 체크인 폼 이벤트 리스너
  const checkinForm = document.getElementById('checkin-form');
  if (checkinForm) {
    checkinForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(checkinForm);
      handleCheckInForm(formData);
    });
  }
  
  // 새로고침 버튼 이벤트 리스너
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      updateStatsDisplay();
      updateRecordsDisplay();
    });
  }
  
  // 내보내기 버튼 이벤트 리스너
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }
  
  console.log('QR 체크인 시스템 초기화 완료');
});

// 전역으로 함수 노출 (HTML에서 직접 호출 가능)
window.checkIn = checkIn;
window.getRecords = getRecords;
window.getStats = getStats;
window.exportData = exportData;
window.updateStatsDisplay = updateStatsDisplay;
window.updateRecordsDisplay = updateRecordsDisplay;
