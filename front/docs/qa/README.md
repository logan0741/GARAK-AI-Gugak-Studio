# QA

이 디렉터리는 수동 검증 체크리스트와 실제 기기 QA 결과를 보관한다.

MVP에서 가장 중요한 QA는 오디오 품질이다. 에뮬레이터는 터치-발음 지연과 오디오 끊김 판정에 사용하지 않는다.

Day 5 오디오 엔진 판정값은 `day-5-audio-engine-probes.example.json`의 shape를 따라 후보별 probe record로 옮긴다. 최종 선택에 쓰는 probe는 `evidenceSource: 'physical-device'`여야 하며, `src/audio/audioEngineProbeRecord.ts`로 검증한 뒤 decision record를 만든다.

## Required QA Areas

| 영역 | 기준 |
| --- | --- |
| Touch-to-sound latency | 실제 기기 기준 목표 50ms 이하 |
| Polyphony | 최소 8개 voice 동시 재생 |
| Pitch bend | 클릭 노이즈 없는 연속 pitch 변화 |
| Glissando | 12현 스와이프 시 입력 누락 없음 |
| Mute | 지음 후 자연스러운 release 감쇠 |
| Session fallback | 녹음 실패 시에도 이벤트 세션 보존 |
