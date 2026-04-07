"""
사이트 HTML 구조에 따라 선택자를 조정하세요.
- LIST_ROW_SELECTOR: 목록의 각 공지 row
- LIST_TITLE_LINK_SELECTOR: 제목 링크(a)
- DETAIL_BODY_SELECTOR: 상세 본문 영역
"""

# 목록: 각 공지 행
LIST_ROW_SELECTOR = "table tbody tr"

# 목록: 제목 링크(상세 URL)
LIST_TITLE_LINK_SELECTOR = "a"

# 상세: 본문 영역(사이트마다 다름. 필요한 경우 수정)
DETAIL_BODY_SELECTOR = ".board-view, .view, .content, .bbs_view, #content, .article, .boardCon"
